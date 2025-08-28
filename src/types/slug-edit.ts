export interface SlugEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSlug: string;
  promptId: string;
  promptName: string;
  workspaceSlug: string;
  workspaceId: string;
  onSlugUpdate: (newSlug: string) => void;
}

export interface SlugUpdateRequest {
  id: string;
  workspace_id: string;
  slug: string;
}

export interface SlugUpdateResponse {
  data: {
    id: string;
    slug: string;
  };
}

export interface SlugValidationError {
  error: string;
  code: 'INVALID_SLUG_FORMAT' | 'INVALID_SLUG_LENGTH' | 'SLUG_EXISTS';
}