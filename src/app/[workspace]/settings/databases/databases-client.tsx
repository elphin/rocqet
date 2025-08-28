'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database,
  Plus,
  Settings,
  Trash2,
  TestTube,
  Shield,
  Link as LinkIcon,
  Check,
  X,
  Eye,
  EyeOff,
  Info,
  AlertCircle,
  RefreshCw,
  Copy,
  Server,
  Cloud,
  HardDrive,
  Zap,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast-config';
import { 
  createDatabaseConnection,
  updateDatabaseConnection,
  deleteDatabaseConnection,
  testDatabaseConnection,
  syncDatabaseSchema
} from '@/app/actions/database-connection-actions';

const DATABASE_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL', icon: Database, color: 'blue' },
  { value: 'mysql', label: 'MySQL', icon: Database, color: 'orange' },
  { value: 'mongodb', label: 'MongoDB', icon: Database, color: 'green' },
  { value: 'redis', label: 'Redis', icon: Zap, color: 'red' },
  { value: 'supabase', label: 'Supabase', icon: Cloud, color: 'emerald' },
  { value: 'firebase', label: 'Firebase', icon: Cloud, color: 'yellow' },
  { value: 'snowflake', label: 'Snowflake', icon: Cloud, color: 'cyan' },
  { value: 'bigquery', label: 'BigQuery', icon: Cloud, color: 'blue' },
  { value: 'custom', label: 'Custom', icon: Server, color: 'neutral' },
];

interface DatabaseConnection {
  id: string;
  name: string;
  description?: string;
  type: string;
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  password?: string;
  connection_string?: string;
  ssl_enabled: boolean;
  read_only: boolean;
  allowed_operations: string[];
  test_status?: string;
  test_message?: string;
  last_tested_at?: string;
  created_at: string;
}

interface DatabaseManagerClientProps {
  workspaceId: string;
  workspaceSlug: string;
  initialConnections: DatabaseConnection[];
}

export default function DatabaseManagerClient({
  workspaceId,
  workspaceSlug,
  initialConnections
}: DatabaseManagerClientProps) {
  const [connections, setConnections] = useState<DatabaseConnection[]>(initialConnections);
  const [showNewConnection, setShowNewConnection] = useState(false);
  const [editingConnection, setEditingConnection] = useState<DatabaseConnection | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [syncingSchema, setSyncingSchema] = useState<string | null>(null);

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this database connection?')) {
      return;
    }

    try {
      await deleteDatabaseConnection(connectionId);
      setConnections(connections.filter(c => c.id !== connectionId));
      toast.success('Database connection deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete connection');
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    setTestingConnection(connectionId);
    try {
      const result = await testDatabaseConnection(connectionId);
      
      // Update local state with test result
      setConnections(connections.map(c => 
        c.id === connectionId 
          ? { ...c, test_status: 'success', test_message: result.message }
          : c
      ));
      
      toast.success(result.message || 'Connection test successful');
    } catch (error: any) {
      // Update local state with error
      setConnections(connections.map(c => 
        c.id === connectionId 
          ? { ...c, test_status: 'failed', test_message: error.message }
          : c
      ));
      
      toast.error(error.message || 'Connection test failed');
    } finally {
      setTestingConnection(null);
    }
  };

  const handleSyncSchema = async (connectionId: string) => {
    setSyncingSchema(connectionId);
    try {
      const result = await syncDatabaseSchema(connectionId);
      toast.success(`Schema synced: ${result.tablesFound} tables found`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync schema');
    } finally {
      setSyncingSchema(null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                Database Connections
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Connect and manage your databases for use in prompts and chains
              </p>
            </div>
            <Button
              onClick={() => setShowNewConnection(true)}
              className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Connection
            </Button>
          </div>
        </div>
      </div>

      {/* Connections Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {connections.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Database className="w-10 h-10 text-neutral-600 dark:text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              No database connections
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
              Connect your databases to use them in prompts and chains. All connections are encrypted and secure.
            </p>
            <Button
              onClick={() => setShowNewConnection(true)}
              className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Database
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map((connection) => {
              const dbType = DATABASE_TYPES.find(t => t.value === connection.type);
              const Icon = dbType?.icon || Database;
              
              return (
                <motion.div
                  key={connection.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {connection.name}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {dbType?.label || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {connection.read_only && (
                        <Badge variant="outline" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Read-only
                        </Badge>
                      )}
                      {connection.ssl_enabled && (
                        <Badge variant="outline" className="text-xs">
                          SSL
                        </Badge>
                      )}
                    </div>
                  </div>

                  {connection.description && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                      {connection.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500 dark:text-neutral-400">Host</span>
                      <span className="text-neutral-700 dark:text-neutral-300 font-mono">
                        {connection.host || 'Connection string'}
                      </span>
                    </div>
                    {connection.database && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-500 dark:text-neutral-400">Database</span>
                        <span className="text-neutral-700 dark:text-neutral-300 font-mono">
                          {connection.database}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500 dark:text-neutral-400">Status</span>
                      {connection.test_status === 'success' ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <Check className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      ) : connection.test_status === 'failed' ? (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          <X className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Not tested
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center space-x-2">
                      <Link 
                        href={`/${workspaceSlug}/queries?connection=${connection.id}`}
                        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title="View queries"
                      >
                        <Code className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                      </Link>
                      <button
                        onClick={() => handleTestConnection(connection.id)}
                        disabled={testingConnection === connection.id}
                        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                        title="Test connection"
                      >
                        {testingConnection === connection.id ? (
                          <RefreshCw className="w-4 h-4 text-neutral-600 dark:text-neutral-400 animate-spin" />
                        ) : (
                          <TestTube className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                        )}
                      </button>
                      <button
                        onClick={() => handleSyncSchema(connection.id)}
                        disabled={syncingSchema === connection.id}
                        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
                        title="Sync schema"
                      >
                        {syncingSchema === connection.id ? (
                          <RefreshCw className="w-4 h-4 text-neutral-600 dark:text-neutral-400 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingConnection(connection)}
                        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title="Edit connection"
                      >
                        <Settings className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteConnection(connection.id)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete connection"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* New/Edit Connection Modal */}
      <AnimatePresence>
        {(showNewConnection || editingConnection) && (
          <ConnectionModal
            connection={editingConnection}
            workspaceId={workspaceId}
            onClose={() => {
              setShowNewConnection(false);
              setEditingConnection(null);
            }}
            onSave={(newConnection) => {
              if (editingConnection) {
                setConnections(connections.map(c => 
                  c.id === newConnection.id ? newConnection : c
                ));
              } else {
                setConnections([newConnection, ...connections]);
              }
              setShowNewConnection(false);
              setEditingConnection(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Connection Modal Component
function ConnectionModal({ 
  connection, 
  workspaceId, 
  onClose, 
  onSave 
}: {
  connection?: DatabaseConnection | null;
  workspaceId: string;
  onClose: () => void;
  onSave: (connection: DatabaseConnection) => void;
}) {
  const [formData, setFormData] = useState({
    name: connection?.name || '',
    description: connection?.description || '',
    type: connection?.type || 'postgresql',
    host: connection?.host || '',
    port: connection?.port || '5432',
    database: connection?.database || '',
    username: connection?.username || '',
    password: '',
    connectionString: connection?.connection_string || '',
    sslEnabled: connection?.ssl_enabled || false,
    readOnly: connection?.read_only !== false,
    useConnectionString: !!connection?.connection_string
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Please enter a connection name');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        host: formData.useConnectionString ? undefined : formData.host,
        port: formData.useConnectionString ? undefined : formData.port,
        database: formData.useConnectionString ? undefined : formData.database,
        username: formData.useConnectionString ? undefined : formData.username,
        password: formData.password || undefined,
        connectionString: formData.useConnectionString ? formData.connectionString : undefined,
        sslEnabled: formData.sslEnabled,
        readOnly: formData.readOnly,
        allowedOperations: formData.readOnly ? ['select'] : ['select', 'insert', 'update', 'delete']
      };

      let result;
      if (connection) {
        result = await updateDatabaseConnection(connection.id, data);
      } else {
        result = await createDatabaseConnection(workspaceId, data);
      }

      onSave(result);
      toast.success(connection ? 'Connection updated' : 'Connection created');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save connection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {connection ? 'Edit Database Connection' : 'New Database Connection'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Connection Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Production Database"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Main application database"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Database Type</Label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              >
                {DATABASE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Connection Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.useConnectionString}
                onCheckedChange={(checked) => setFormData({ ...formData, useConnectionString: checked })}
              />
              <Label>Use connection string</Label>
            </div>

            {formData.useConnectionString ? (
              <div>
                <Label>Connection String</Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.connectionString}
                  onChange={(e) => setFormData({ ...formData, connectionString: e.target.value })}
                  placeholder="postgresql://user:password@host:port/database"
                  className="mt-1 font-mono"
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Host</Label>
                    <Input
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      placeholder="localhost"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Port</Label>
                    <Input
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                      placeholder="5432"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Database Name</Label>
                  <Input
                    value={formData.database}
                    onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                    placeholder="mydb"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Username</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="dbuser"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={connection ? '••••••••' : 'Enter password'}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-neutral-500" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Security Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Security Settings
            </h3>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.sslEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, sslEnabled: checked })}
              />
              <Label>Use SSL/TLS encryption</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.readOnly}
                onCheckedChange={(checked) => setFormData({ ...formData, readOnly: checked })}
              />
              <Label>Read-only access (recommended)</Label>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-medium mb-1">Security Note</p>
                  <p>
                    Database credentials are encrypted before storage. We recommend using read-only 
                    credentials and IP whitelisting for additional security.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {connection ? 'Update' : 'Create'} Connection
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}