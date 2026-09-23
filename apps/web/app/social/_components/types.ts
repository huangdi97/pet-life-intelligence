/** OWN-012 Social 页面共享类型。 */
export interface SocialProfile {
  pet_id: string;
  profile?: {
    good_with_dogs?: string;
    good_with_cats?: string;
    good_with_kids?: string;
    good_with_strangers?: string;
    notes?: string;
  } | null;
}

export interface PetFriend {
  request_id: string;
  friend_pet_id: string;
  status: string;
}
