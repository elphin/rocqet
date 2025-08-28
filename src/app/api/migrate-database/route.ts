import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if slug column exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'prompts' 
      AND column_name = 'slug';
    `;
    
    const checkResult = await client.query(checkColumnQuery);
    
    if (checkResult.rows.length > 0) {
      await client.end();
      return NextResponse.json({
        message: 'Slug column already exists! You can visit /api/fix-prompt-slugs to generate slugs.',
        status: 'already_exists'
      });
    }

    // Add slug column
    console.log('Adding slug column...');
    await client.query(`
      ALTER TABLE prompts 
      ADD COLUMN slug VARCHAR(255);
    `);
    console.log('Slug column added successfully');

    // Create index
    console.log('Creating index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS prompts_workspace_slug_idx 
      ON prompts(workspace_id, slug);
    `);
    console.log('Index created successfully');

    await client.end();

    return NextResponse.json({
      message: 'Database migration completed successfully!',
      status: 'success',
      next_step: 'Now visit /api/fix-prompt-slugs to generate slugs for existing prompts'
    });
    
  } catch (error: any) {
    console.error('Database migration error:', error);
    
    try {
      await client.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    
    return NextResponse.json({ 
      error: error.message,
      status: 'error',
      details: error.detail || error.hint || 'Unknown error'
    }, { status: 500 });
  }
}