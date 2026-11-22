export interface Steward {
  name: string;
  email: string;
  department: string;
}

export interface GlossaryTerm {
  id: string;
  display_name: string;
  category: string;
  definition: string;
  synonyms: string[];
  steward: Steward;
  linked_assets_count: number;
  linked_assets_names: string[];
  last_updated: string;
}

export interface TagAttribute {
  key: string;
  display_name: string;
  value: string;
  badge_color: 'green' | 'yellow' | 'red' | 'blue' | 'purple';
}

export interface CatalogAsset {
  id: string;
  display_name: string;
  fully_qualified_name: string;
  system: string;
  asset_type: string;
  domain: string;
  tier: string;
  description: string;
  steward: Steward;
  tags: TagAttribute[];
  quality_score: number;
  access_status: 'GRANTED' | 'REQUEST_REQUIRED';
  policy_tags?: string[];
  glossary_terms?: string[];
  columns?: {
    name: string;
    type: string;
    mode: string;
    policy_tag?: string;
    glossary_term?: string;
  }[];
  aspects?: {
    thai_description?: string;
    security_tier?: string;
    is_personal_data?: boolean;
    data_owner?: string;
  };
}

export interface AccessRequest {
  asset_id: string;
  user_email: string;
  justification: string;
  duration_days: number;
}

export interface BulkAccessRequest {
  asset_ids: string[];
  user_email: string;
  justification: string;
  duration_days: number;
}

export interface GCPConfig {
  projectId: string;
  isConnected: boolean;
  statusMessage?: string;
  sampleAssetsCount?: number;
  portalLogoUrl?: string;
  portalTitle?: string;
}

export interface UserProfile {
  email: string;
  name: string;
  avatar_initials: string;
  auth_source: string;
}

export interface DraftTerm {
  id: string;
  display_name: string;
  category: string;
  definition: string;
  synonyms: string[];
}
