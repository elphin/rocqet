# Edit Page Updates Required

## Changes to apply to `src/app/[workspace]/prompts/[id]/edit/page.tsx`:

### 1. Default Visibility Based on Tier
```typescript
// In useEffect where membership is loaded:
const tier = membership.workspaces.subscription_tier || 'free';
setUserTier(tier);

// When loading prompt:
// Instead of complex logic, use:
setIsPublic(prompt.is_shared || prompt.visibility === 'public' || tier === 'free');
```

### 2. Move Shortcode to Right Sidebar
- Remove shortcode from Basic Information section
- Add shortcode field under Organization section in right sidebar

### 3. Change Visibility Radio Buttons to Regular Buttons
```typescript
<div className="flex gap-2">
  <Button
    type="button"
    variant={!isPublic ? "default" : "outline"}
    size="sm"
    onClick={() => setIsPublic(false)}
    disabled={userTier === 'free'}
    className="flex-1"
  >
    <Lock className="h-4 w-4 mr-2" />
    Private
  </Button>
  
  <Button
    type="button"
    variant={isPublic ? "default" : "outline"}
    size="sm"
    onClick={() => setIsPublic(true)}
    className="flex-1"
  >
    <Globe className="h-4 w-4 mr-2" />
    Public
  </Button>
</div>
```

### 4. Add Save Button to Top of Right Sidebar
- Add Save button as first item in right sidebar
- Keep existing Save button in header
- Add another Save button below content editor

### 5. Structure Changes
```
Right Sidebar Order:
1. Save Button (new)
2. Organization
   - Folder
   - Tags  
   - Shortcode (moved here)
3. Model Settings
4. Visibility

Left Column:
1. Basic Information (without shortcode)
2. Prompt Content
3. Save Button (new, below editor)
```

## Important Notes
- Both new and edit pages should have identical layouts for consistency
- Free tier defaults to public, Pro+ defaults to private
- Shortcode is optional but should be in Organization section