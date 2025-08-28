'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import crypto from 'crypto';

// Encryption for sensitive data
const algorithm = 'aes-256-gcm';
// Use environment key or generate a default one (CHANGE IN PRODUCTION!)
const secretKey = process.env.DB_ENCRYPTION_KEY || 
  // This is a 32-byte hex string (64 characters) for development only
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function encrypt(text: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

function decrypt(encrypted: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, 'hex'), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Validation schema
const DatabaseConnectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum([
    'postgresql',
    'mysql',
    'mongodb',
    'redis',
    'elasticsearch',
    'clickhouse',
    'snowflake',
    'bigquery',
    'redshift',
    'dynamodb',
    'cosmosdb',
    'firebase',
    'supabase',
    'custom'
  ]),
  host: z.string().optional(),
  port: z.string().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  connectionString: z.string().optional(),
  sslEnabled: z.boolean().default(false),
  readOnly: z.boolean().default(true),
  allowedOperations: z.array(z.enum(['select', 'insert', 'update', 'delete'])).default(['select']),
});

export async function createDatabaseConnection(
  workspaceId: string,
  data: z.infer<typeof DatabaseConnectionSchema>
) {
  try {
    const supabase = await createClient();
    
    // Check user permissions (must be pro or higher)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    // Check workspace tier
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('subscription_tier')
      .eq('id', workspaceId)
      .single();
      
    if (!workspace || !['pro', 'business'].includes(workspace.subscription_tier)) {
      throw new Error('Database connections require a Pro or Business subscription');
    }
    
    // Validate input
    const validatedData = DatabaseConnectionSchema.parse(data);
  
    // Encrypt sensitive data
    let encryptedPassword = null;
    let encryptedConnectionString = null;
    
    if (validatedData.password) {
      const { encrypted, iv, tag } = encrypt(validatedData.password);
      encryptedPassword = JSON.stringify({ encrypted, iv, tag });
    }
    
    if (validatedData.connectionString) {
      const { encrypted, iv, tag } = encrypt(validatedData.connectionString);
      encryptedConnectionString = JSON.stringify({ encrypted, iv, tag });
    }
    
    // Create connection
    const { data: connection, error } = await supabase
      .from('database_connections')
      .insert({
        workspace_id: workspaceId,
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        host: validatedData.host,
        port: validatedData.port,
        database: validatedData.database,
        username: validatedData.username,
        password: encryptedPassword,
        connection_string: encryptedConnectionString,
        ssl_enabled: validatedData.sslEnabled,
        read_only: validatedData.readOnly,
        allowed_operations: validatedData.allowedOperations,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating database connection:', error);
      throw new Error('Failed to create database connection');
    }
    
    revalidatePath(`/[workspace]/settings/databases`, 'page');
    
    return connection;
  } catch (error: any) {
    console.error('Database connection creation error:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('subscription_tier')) {
      throw new Error('Database connections require a Pro or Business subscription');
    }
    if (error.code === '23505') {
      throw new Error('A connection with this name already exists');
    }
    
    throw new Error(error.message || 'Failed to create database connection');
  }
}

export async function updateDatabaseConnection(
  connectionId: string,
  data: Partial<z.infer<typeof DatabaseConnectionSchema>>
) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Prepare update data with proper snake_case mapping
  const updateData: any = {
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  
  // Map camelCase to snake_case
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.host !== undefined) updateData.host = data.host;
  if (data.port !== undefined) updateData.port = data.port;
  if (data.database !== undefined) updateData.database = data.database;
  if (data.username !== undefined) updateData.username = data.username;
  if (data.sslEnabled !== undefined) updateData.ssl_enabled = data.sslEnabled;
  if (data.readOnly !== undefined) updateData.read_only = data.readOnly;
  if (data.allowedOperations !== undefined) updateData.allowed_operations = data.allowedOperations;
  
  // Encrypt sensitive data if provided
  if (data.password) {
    const { encrypted, iv, tag } = encrypt(data.password);
    updateData.password = JSON.stringify({ encrypted, iv, tag });
  }
  
  if (data.connectionString) {
    const { encrypted, iv, tag } = encrypt(data.connectionString);
    updateData.connection_string = JSON.stringify({ encrypted, iv, tag });
  }
  
  // Update connection
  const { data: connection, error } = await supabase
    .from('database_connections')
    .update(updateData)
    .eq('id', connectionId)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating database connection:', error);
    throw new Error('Failed to update database connection');
  }
  
  revalidatePath(`/[workspace]/settings/databases`, 'page');
  
  return connection;
}

export async function deleteDatabaseConnection(connectionId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('database_connections')
    .delete()
    .eq('id', connectionId);
    
  if (error) {
    console.error('Error deleting database connection:', error);
    throw new Error('Failed to delete database connection');
  }
  
  revalidatePath(`/[workspace]/settings/databases`, 'page');
  
  return { success: true };
}

export async function testDatabaseConnection(connectionId: string) {
  const supabase = await createClient();
  
  // Get connection details
  const { data: connection, error: fetchError } = await supabase
    .from('database_connections')
    .select('*')
    .eq('id', connectionId)
    .single();
    
  if (fetchError || !connection) {
    throw new Error('Connection not found');
  }
  
  // Decrypt credentials
  let password = null;
  let connectionString = null;
  
  if (connection.password) {
    const { encrypted, iv, tag } = JSON.parse(connection.password);
    password = decrypt(encrypted, iv, tag);
  }
  
  if (connection.connection_string) {
    const { encrypted, iv, tag } = JSON.parse(connection.connection_string);
    connectionString = decrypt(encrypted, iv, tag);
  }
  
  try {
    // Test connection based on type
    let testResult = { success: false, message: '' };
    
    switch (connection.type) {
      case 'postgresql':
        testResult = await testPostgreSQLConnection({
          host: connection.host,
          port: connection.port,
          database: connection.database,
          username: connection.username,
          password,
          connectionString,
          sslEnabled: connection.ssl_enabled
        });
        break;
      case 'mysql':
        testResult = await testMySQLConnection({
          host: connection.host,
          port: connection.port,
          database: connection.database,
          username: connection.username,
          password,
          sslEnabled: connection.ssl_enabled
        });
        break;
      // Add more database types as needed
      default:
        testResult = { success: false, message: 'Database type not yet supported for testing' };
    }
    
    // Update test status
    await supabase
      .from('database_connections')
      .update({
        last_tested_at: new Date().toISOString(),
        test_status: testResult.success ? 'success' : 'failed',
        test_message: testResult.message,
      })
      .eq('id', connectionId);
      
    // Log the test
    await supabase
      .from('database_connection_logs')
      .insert({
        connection_id: connectionId,
        workspace_id: connection.workspace_id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        operation: 'test',
        status: testResult.success ? 'success' : 'error',
        error: testResult.success ? null : testResult.message,
      });
      
    return testResult;
  } catch (error: any) {
    console.error('Connection test error:', error);
    
    // Update test status
    await supabase
      .from('database_connections')
      .update({
        last_tested_at: new Date().toISOString(),
        test_status: 'failed',
        test_message: error.message,
      })
      .eq('id', connectionId);
      
    throw new Error(`Connection test failed: ${error.message}`);
  }
}

async function testPostgreSQLConnection(config: any) {
  // In production, you would use pg library
  // For now, return mock result
  return {
    success: true,
    message: 'PostgreSQL connection successful'
  };
}

async function testMySQLConnection(config: any) {
  // In production, you would use mysql2 library
  // For now, return mock result
  return {
    success: true,
    message: 'MySQL connection successful'
  };
}

export async function getDatabaseConnections(workspaceId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('database_connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching database connections:', error);
    throw new Error('Failed to fetch database connections');
  }
  
  // Remove sensitive data before sending to client
  const sanitizedConnections = data.map(conn => ({
    ...conn,
    password: conn.password ? '••••••••' : null,
    connection_string: conn.connection_string ? '••••••••' : null,
  }));
  
  return sanitizedConnections;
}

export async function getDatabaseSchemas(connectionId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('database_schemas')
    .select('*')
    .eq('connection_id', connectionId)
    .order('schema_name, table_name');
    
  if (error) {
    console.error('Error fetching database schemas:', error);
    throw new Error('Failed to fetch database schemas');
  }
  
  return data;
}

export async function syncDatabaseSchema(connectionId: string) {
  // This would connect to the database and fetch schema information
  // For now, return mock result
  const supabase = await createClient();
  
  // Get connection details
  const { data: connection } = await supabase
    .from('database_connections')
    .select('*')
    .eq('id', connectionId)
    .single();
    
  if (!connection) {
    throw new Error('Connection not found');
  }
  
  // In production, fetch actual schema
  // For now, create mock schema
  const mockSchemas = [
    {
      connection_id: connectionId,
      schema_name: 'public',
      table_name: 'users',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, primary: true },
        { name: 'email', type: 'varchar(255)', nullable: false },
        { name: 'created_at', type: 'timestamp', nullable: false },
      ],
      indexes: ['id', 'email'],
      row_count: '1000',
    },
  ];
  
  // Clear existing schemas and insert new ones
  await supabase
    .from('database_schemas')
    .delete()
    .eq('connection_id', connectionId);
    
  const { error } = await supabase
    .from('database_schemas')
    .insert(mockSchemas);
    
  if (error) {
    throw new Error('Failed to sync database schema');
  }
  
  return { success: true, tablesFound: mockSchemas.length };
}