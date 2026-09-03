// AI 生成的勋章插画映射（Gemini 暖色手绘风）
import helper1 from '@/assets/badges/helper_1.jpg';
import helper5 from '@/assets/badges/helper_5.jpg';
import helper20 from '@/assets/badges/helper_20.jpg';
import feedback5 from '@/assets/badges/feedback_5.jpg';
import feedback20 from '@/assets/badges/feedback_20.jpg';
import topic1 from '@/assets/badges/topic_1.jpg';
import topic5 from '@/assets/badges/topic_5.jpg';
import guide1 from '@/assets/badges/guide_1.jpg';
import guide5 from '@/assets/badges/guide_5.jpg';
import guide20 from '@/assets/badges/guide_20.jpg';
import flower10 from '@/assets/badges/flower_10.jpg';
import flower50 from '@/assets/badges/flower_50.jpg';
import firstOwnerTop30 from '@/assets/badges/first_owner_top30.jpg';
import founder from '@/assets/badges/founder.jpg';
import seed from '@/assets/badges/seed.jpg';
import helpfulNeighbor from '@/assets/badges/helpful_neighbor.jpg';
import mutualAidStar from '@/assets/badges/mutual_aid_star.jpg';
import communityGuardian from '@/assets/badges/community_guardian.jpg';
import petFriend from '@/assets/badges/pet_friend.jpg';

const BADGE_IMAGES: Record<string, string> = {
  helper_1: helper1,
  helper_5: helper5,
  helper_20: helper20,
  feedback_5: feedback5,
  feedback_20: feedback20,
  topic_1: topic1,
  topic_5: topic5,
  guide_1: guide1,
  guide_5: guide5,
  guide_20: guide20,
  flower_10: flower10,
  flower_50: flower50,
  first_owner_top30: firstOwnerTop30,
  founder,
  seed,
  helpful_neighbor: helpfulNeighbor,
  mutual_aid_star: mutualAidStar,
  community_guardian: communityGuardian,
  pet_friend: petFriend,
};

export function getBadgeImage(code: string | undefined | null): string | null {
  return (code && BADGE_IMAGES[code]) || null;
}
