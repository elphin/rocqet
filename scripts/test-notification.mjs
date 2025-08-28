import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function testNotificationSystem() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Get the first user
    const { rows: users } = await client.query(`
      SELECT id, email FROM auth.users LIMIT 1
    `);

    if (users.length === 0) {
      console.log('No users found in the database');
      return;
    }

    const user = users[0];
    console.log(`Creating test notification for user: ${user.email}`);

    // First check what columns exist
    const { rows: columns } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'notifications'
      ORDER BY ordinal_position
    `);
    console.log('Notification table columns:', columns.map(c => c.column_name).join(', '));

    // Create a test notification (without metadata if it doesn't exist)
    const hasMetadata = columns.some(c => c.column_name === 'metadata');
    
    const insertQuery = hasMetadata ? `
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        metadata
      ) VALUES (
        $1,
        'system_announcement',
        'Welcome to ROCQET Notifications!',
        'Your notification system is now working. You can receive real-time updates about your workspace activity.',
        '{"test": true}'::jsonb
      ) RETURNING id, title, message
    ` : `
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message
      ) VALUES (
        $1,
        'system_announcement',
        'Welcome to ROCQET Notifications!',
        'Your notification system is now working. You can receive real-time updates about your workspace activity.'
      ) RETURNING id, title, message
    `;

    const { rows: notifications } = await client.query(insertQuery, [user.id]);

    console.log('✓ Test notification created:', notifications[0]);

    // Create an activity feed entry
    const { rows: workspaces } = await client.query(`
      SELECT w.id, w.name 
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.user_id = $1
      LIMIT 1
    `, [user.id]);

    if (workspaces.length > 0) {
      const workspace = workspaces[0];
      
      // Check activity_feed columns
      const { rows: activityColumns } = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'activity_feed'
      `);
      const hasActivityMetadata = activityColumns.some(c => c.column_name === 'metadata');
      
      const activityQuery = hasActivityMetadata ? `
        INSERT INTO activity_feed (
          workspace_id,
          actor_id,
          actor_name,
          action,
          entity_type,
          entity_name,
          metadata
        ) VALUES (
          $1,
          $2,
          'System',
          'created',
          'notification',
          'Test Activity',
          '{"test": true}'::jsonb
        ) RETURNING id, action, entity_name
      ` : `
        INSERT INTO activity_feed (
          workspace_id,
          actor_id,
          actor_name,
          action,
          entity_type,
          entity_name
        ) VALUES (
          $1,
          $2,
          'System',
          'created',
          'notification',
          'Test Activity'
        ) RETURNING id, action, entity_name
      `;
      
      const { rows: activities } = await client.query(activityQuery, [workspace.id, user.id]);

      console.log('✓ Test activity created:', activities[0]);
    }

    // Check notification stats
    const { rows: stats } = await client.query(`
      SELECT * FROM get_notification_stats($1)
    `, [user.id]);

    console.log('✓ Notification stats:', stats[0]);

    // Check notification preferences
    const { rows: prefs } = await client.query(`
      SELECT * FROM notification_preferences WHERE user_id = $1
    `, [user.id]);

    if (prefs.length === 0) {
      console.log('Creating default notification preferences...');
      await client.query(`
        INSERT INTO notification_preferences (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `, [user.id]);
      console.log('✓ Default preferences created');
    } else {
      console.log('✓ User has notification preferences');
    }

    console.log('\n✅ Notification system test completed successfully!');
    console.log('Check your app to see the test notification.');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await client.end();
    console.log('✓ Database connection closed');
  }
}

testNotificationSystem();