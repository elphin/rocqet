/**
 * Database Query Service - Handles execution of database queries in chains
 */

import { createClient } from '@/lib/supabase/server';
import { Pool } from 'pg';

export interface QueryExecutionOptions {
  queryId?: string;
  sql?: string;
  parameters?: Record<string, any>;
  workspaceId: string;
  connectionId?: string;
}

export interface QueryExecutionResult {
  success: boolean;
  rows: any[];
  rowCount: number;
  fields?: string[];
  error?: string;
  executionTimeMs?: number;
}

export class DatabaseQueryService {
  /**
   * Execute a saved query
   */
  static async executeSavedQuery(
    queryId: string,
    parameters: Record<string, any>,
    workspaceId: string
  ): Promise<QueryExecutionResult> {
    const startTime = Date.now();
    
    try {
      const supabase = await createClient();
      
      // Fetch the saved query
      const { data: query, error } = await supabase
        .from('queries')
        .select('*')
        .eq('id', queryId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error || !query) {
        throw new Error(`Query not found: ${queryId}`);
      }

      // Get the database connection for this query
      const { data: connection } = await supabase
        .from('database_connections')
        .select('*')
        .eq('id', query.connection_id)
        .eq('workspace_id', workspaceId)
        .single();

      if (!connection) {
        throw new Error('Database connection not found');
      }

      // Substitute parameters in the SQL
      let sql = query.sql_query;
      for (const [key, value] of Object.entries(parameters)) {
        // Replace :paramName with actual value (safely)
        const regex = new RegExp(`:${key}\\b`, 'g');
        // For strings, add quotes
        const quotedValue = typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
        sql = sql.replace(regex, String(quotedValue));
      }

      // Execute based on connection type
      const result = await this.executeQueryOnConnection(sql, connection, parameters);
      
      // Log the execution
      await supabase
        .from('query_executions')
        .insert({
          query_id: queryId,
          workspace_id: workspaceId,
          executed_sql: sql,
          parameters,
          status: result.success ? 'success' : 'failed',
          error_message: result.error,
          execution_time_ms: Date.now() - startTime,
          row_count: result.rowCount
        });

      return {
        ...result,
        executionTimeMs: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        success: false,
        rows: [],
        rowCount: 0,
        error: error.message,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Execute inline SQL directly
   */
  static async executeInlineQuery(
    sql: string,
    workspaceId: string,
    connectionId?: string
  ): Promise<QueryExecutionResult> {
    const startTime = Date.now();
    
    try {
      const supabase = await createClient();
      
      // If no connection specified, use the default workspace database
      if (!connectionId) {
        // Execute on Supabase directly
        return await this.executeSupabaseQuery(sql);
      }

      // Get the specified connection
      const { data: connection } = await supabase
        .from('database_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('workspace_id', workspaceId)
        .single();

      if (!connection) {
        throw new Error('Database connection not found');
      }

      // Execute on the connection
      const result = await this.executeQueryOnConnection(sql, connection, {});

      return {
        ...result,
        executionTimeMs: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        success: false,
        rows: [],
        rowCount: 0,
        error: error.message,
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Execute query on Supabase database
   */
  private static async executeSupabaseQuery(sql: string): Promise<QueryExecutionResult> {
    try {
      const supabase = await createClient();
      
      // Parse the SQL to determine the operation
      const operation = sql.trim().toLowerCase().split(' ')[0];
      
      // For SELECT queries, we can use Supabase's rpc or direct query
      if (operation === 'select') {
        // Extract table name (simple parser)
        const tableMatch = sql.match(/from\s+(\w+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          
          // Use Supabase client for simple queries
          const { data, error } = await (supabase as any)
            .from(tableName)
            .select('*');
          
          if (error) throw error;
          
          return {
            success: true,
            rows: data || [],
            rowCount: data?.length || 0,
            fields: data?.length > 0 ? Object.keys(data[0]) : []
          };
        }
      }

      // For complex queries, we need to use raw SQL (requires database URL)
      if (process.env.DATABASE_URL) {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });

        try {
          const result = await pool.query(sql);
          
          return {
            success: true,
            rows: result.rows,
            rowCount: result.rowCount || 0,
            fields: result.fields?.map(f => f.name)
          };
        } finally {
          await pool.end();
        }
      }

      throw new Error('Complex queries require DATABASE_URL environment variable');
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Execute query on external database connection
   */
  private static async executeQueryOnConnection(
    sql: string,
    connection: any,
    parameters: Record<string, any>
  ): Promise<QueryExecutionResult> {
    try {
      // Decrypt connection details (in production, use proper encryption)
      const decryptedConfig = JSON.parse(connection.encrypted_config);
      
      switch (connection.type) {
        case 'postgresql':
          return await this.executePostgresQuery(sql, decryptedConfig);
        
        case 'mysql':
          return await this.executeMySQLQuery(sql, decryptedConfig);
        
        case 'supabase':
          // For external Supabase connections
          return await this.executeExternalSupabaseQuery(sql, decryptedConfig);
        
        default:
          throw new Error(`Unsupported database type: ${connection.type}`);
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Execute PostgreSQL query
   */
  private static async executePostgresQuery(
    sql: string,
    config: any
  ): Promise<QueryExecutionResult> {
    const pool = new Pool({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false
    });

    try {
      const result = await pool.query(sql);
      
      return {
        success: true,
        rows: result.rows,
        rowCount: result.rowCount || 0,
        fields: result.fields?.map(f => f.name)
      };
    } finally {
      await pool.end();
    }
  }

  /**
   * Execute MySQL query (placeholder)
   */
  private static async executeMySQLQuery(
    sql: string,
    config: any
  ): Promise<QueryExecutionResult> {
    // TODO: Implement MySQL support with mysql2 package
    throw new Error('MySQL support coming soon');
  }

  /**
   * Execute query on external Supabase instance
   */
  private static async executeExternalSupabaseQuery(
    sql: string,
    config: any
  ): Promise<QueryExecutionResult> {
    // TODO: Implement external Supabase connection
    throw new Error('External Supabase connections coming soon');
  }

  /**
   * Validate SQL query (basic safety checks)
   */
  static validateQuery(sql: string): { valid: boolean; error?: string } {
    const normalizedSql = sql.toLowerCase().trim();
    
    // Block dangerous operations
    const dangerousPatterns = [
      /drop\s+table/i,
      /drop\s+database/i,
      /truncate\s+table/i,
      /delete\s+from.*where\s+1\s*=\s*1/i,
      /update.*set.*where\s+1\s*=\s*1/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(normalizedSql)) {
        return {
          valid: false,
          error: 'Query contains potentially dangerous operations'
        };
      }
    }

    // Check for basic SQL syntax
    const validStarters = ['select', 'insert', 'update', 'delete', 'with'];
    const firstWord = normalizedSql.split(/\s+/)[0];
    
    if (!validStarters.includes(firstWord)) {
      return {
        valid: false,
        error: 'Query must start with SELECT, INSERT, UPDATE, DELETE, or WITH'
      };
    }

    return { valid: true };
  }
}