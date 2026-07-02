import { View, Text, Image } from '@tarojs/components';
import './index.scss';

export interface RankingUser {
  id: string;
  nickname: string;
  avatarUrl: string;
  flowerCount: number;
  helpCount: number;
}

interface RankingTop3Props {
  users?: RankingUser[];
  onViewAll?: () => void;
}

const DEFAULT_USERS: RankingUser[] = [
  { id: '1', nickname: '热心张阿姨', avatarUrl: '', flowerCount: 128, helpCount: 45 },
  { id: '2', nickname: '阳光李哥', avatarUrl: '', flowerCount: 96, helpCount: 38 },
  { id: '3', nickname: '暖心的王姐', avatarUrl: '', flowerCount: 82, helpCount: 31 },
];

function getRankStyle(rank: number) {
  switch (rank) {
    case 0:
      return {
        order: 2,
        size: 96,
        crown: '👑',
        bg: 'linear-gradient(135deg, #f3ead0 0%, #e0a458 100%)',
        border: '3px solid #e0a458',
      };
    case 1:
      return { order: 1, size: 80, crown: '🥈', bg: '#F5F5F5', border: '3px solid #E0E0E0' };
    case 2:
      return { order: 3, size: 80, crown: '🥉', bg: '#fbf0dd', border: '3px solid #FFD9B3' };
    default:
      return { order: rank + 1, size: 80, crown: '', bg: '#fff', border: '3px solid #EFE7D8' };
  }
}

export default function RankingTop3({ users = DEFAULT_USERS, onViewAll }: RankingTop3Props) {
  return (
    <View className="ranking-top3">
      <View className="ranking-top3__podium">
        {users.map((user, idx) => {
          const style = getRankStyle(idx);
          return (
            <View
              key={user.id}
              className={`ranking-top3__person ranking-top3__person--${idx + 1}`}
              style={{ order: style.order }}
            >
              <Text className="ranking-top3__crown">{style.crown}</Text>
              <View
                className="ranking-top3__avatar"
                style={{
                  width: `${style.size}px`,
                  height: `${style.size}px`,
                  background: user.avatarUrl ? '#f5f5f5' : style.bg,
                  border: style.border,
                }}
              >
                {user.avatarUrl ? (
                  <Image
                    className="ranking-top3__avatar-img"
                    src={user.avatarUrl}
                    mode="aspectFill"
                  />
                ) : (
                  <Text className="ranking-top3__avatar-text">{user.nickname.slice(0, 1)}</Text>
                )}
              </View>
              <Text className="ranking-top3__name">{user.nickname}</Text>
              <View className="ranking-top3__stats">
                <Text className="ranking-top3__flower">🌸 {user.flowerCount}</Text>
                <Text className="ranking-top3__help">帮助{user.helpCount}次</Text>
              </View>
            </View>
          );
        })}
      </View>
      <View className="ranking-top3__action" onClick={onViewAll}>
        <Text className="ranking-top3__action-text">查看完整榜单</Text>
        <Text className="ranking-top3__action-arrow">→</Text>
      </View>
    </View>
  );
}
