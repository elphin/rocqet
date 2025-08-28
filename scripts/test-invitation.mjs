import pg from 'pg';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';

// Load environment variables
dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function testInvitationSystem() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Get the first workspace and its owner
    const { rows: workspaces } = await client.query(`
      SELECT w.id, w.name, w.slug, wm.user_id as owner_id
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.role = 'owner'
      LIMIT 1
    `);

    if (workspaces.length === 0) {
      console.log('No workspaces found');
      return;
    }

    const workspace = workspaces[0];
    console.log(`Using workspace: ${workspace.name} (${workspace.slug})`);

    // Get owner details
    const { rows: owners } = await client.query(`
      SELECT id, email FROM auth.users WHERE id = $1
    `, [workspace.owner_id]);

    const owner = owners[0];
    console.log(`Workspace owner: ${owner.email}`);

    // Create a test invitation
    const testEmail = 'test@example.com';
    const inviteToken = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    console.log('\nCreating test invitation...');
    
    // First check if invite already exists
    const { rows: existingInvites } = await client.query(`
      SELECT id FROM workspace_invites 
      WHERE workspace_id = $1 
      AND email = $2 
      AND status = 'pending'
    `, [workspace.id, testEmail]);

    if (existingInvites.length > 0) {
      console.log('⚠️  Pending invite already exists for this email');
      
      // Cancel the existing one
      await client.query(`
        UPDATE workspace_invites 
        SET status = 'cancelled' 
        WHERE id = $1
      `, [existingInvites[0].id]);
      
      console.log('✓ Cancelled existing invite');
    }

    // Create new invitation
    const { rows: invites } = await client.query(`
      INSERT INTO workspace_invites (
        workspace_id,
        email,
        role,
        token,
        invited_by,
        expires_at,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'pending'
      ) RETURNING id, token
    `, [workspace.id, testEmail, 'member', inviteToken, workspace.owner_id, expiresAt]);

    const invite = invites[0];
    console.log('✓ Test invitation created!');
    
    // Generate invite URL
    const inviteUrl = `http://localhost:3000/invite/${invite.token}`;
    console.log(`\n📧 Invitation Details:`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Role: member`);
    console.log(`   Expires: ${expiresAt.toLocaleDateString()}`);
    console.log(`   URL: ${inviteUrl}`);

    // Check if user exists for notification
    const { rows: users } = await client.query(`
      SELECT id FROM auth.users WHERE email = $1
    `, [testEmail]);

    if (users.length > 0) {
      // Create notification for existing user
      await client.query(`
        INSERT INTO notifications (
          user_id,
          workspace_id,
          type,
          title,
          message,
          entity_type,
          entity_id,
          action_url,
          metadata
        ) VALUES (
          $1, $2, 'invite_received',
          'Workspace Invitation',
          $3,
          'workspace_invite',
          $4,
          $5,
          $6::jsonb
        )
      `, [
        users[0].id,
        workspace.id,
        `You've been invited to join "${workspace.name}" as a member`,
        invite.id,
        `/invite/${invite.token}`,
        JSON.stringify({
          workspace_name: workspace.name,
          role: 'member',
          invited_by: owner.email
        })
      ]);
      
      console.log('✓ Notification created for existing user');
    }

    // Log activity
    await client.query(`
      INSERT INTO activity_logs (
        workspace_id,
        user_id,
        action,
        entity_type,
        entity_id,
        metadata
      ) VALUES (
        $1, $2, 'invite_sent', 'workspace_invite', $3, $4::jsonb
      )
    `, [
      workspace.id,
      workspace.owner_id,
      invite.id,
      JSON.stringify({ email: testEmail, role: 'member' })
    ]);

    console.log('✓ Activity logged');

    // Get stats
    const { rows: stats } = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) as total
      FROM workspace_invites
      WHERE workspace_id = $1
    `, [workspace.id]);

    console.log(`\n📊 Workspace Invitation Stats:`);
    console.log(`   Total invites: ${stats[0].total}`);
    console.log(`   Pending: ${stats[0].pending}`);
    console.log(`   Accepted: ${stats[0].accepted}`);
    console.log(`   Cancelled: ${stats[0].cancelled}`);

    console.log('\n✅ Team invitation system test completed!');
    console.log('\nTo test the full flow:');
    console.log('1. Visit the invite URL above');
    console.log('2. Or go to http://localhost:3000/invites to see pending invites');
    console.log(`3. Or go to http://localhost:3000/${workspace.slug}/settings/team to manage team`);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await client.end();
    console.log('✓ Database connection closed');
  }
}

testInvitationSystem();