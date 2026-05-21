import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { BRAND, BRAND_LIGHT } from '../constants/colors';

interface Review {
  id: string; rating: number; comment?: string | null; created_at: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text key={i} style={{ fontSize: size, color: i <= rating ? '#f59e0b' : '#e2e8f0' }}>★</Text>
      ))}
    </View>
  );
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? count / total : 0;
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label}>{label} ★</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${Math.round(pct * 100)}%` as any }]} />
      </View>
      <Text style={barStyles.count}>{count}</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  label: { fontSize: 11, color: '#64748b', fontWeight: '600', width: 14 },
  track: { flex: 1, height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 },
  count: { fontSize: 11, color: '#94a3b8', width: 18, textAlign: 'right' },
});

export default function ReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avgRating, setAvgRating] = useState(0);
  const [distribution, setDistribution] = useState([0, 0, 0, 0, 0]);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: shops } = await supabase.from('shops').select('id').eq('owner_id', session.user.id).limit(1);
      if (!shops?.length) return;
      const shopId = shops[0].id;

      const { data } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, profiles(full_name, email)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      const list = (data || []) as Review[];
      setReviews(list);

      if (list.length > 0) {
        const avg = list.reduce((s, r) => s + r.rating, 0) / list.length;
        setAvgRating(Math.round(avg * 10) / 10);
        const dist = [0, 0, 0, 0, 0];
        list.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
        setDistribution(dist);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()} ${['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'][d.getMonth()]} ${d.getFullYear()}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={BRAND} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={reviews}
        keyExtractor={r => r.id}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Yorumlar</Text>

            {reviews.length > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.avgScore}>{avgRating.toFixed(1)}</Text>
                  <Stars rating={Math.round(avgRating)} size={18} />
                  <Text style={styles.totalCount}>{reviews.length} yorum</Text>
                </View>
                <View style={styles.summaryRight}>
                  {[5, 4, 3, 2, 1].map(r => (
                    <RatingBar key={r} label={String(r)} count={distribution[r - 1]} total={reviews.length} />
                  ))}
                </View>
              </View>
            )}

            {reviews.length > 0 && <Text style={styles.sectionTitle}>Tüm Yorumlar</Text>}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>⭐</Text>
            <Text style={styles.emptyTitle}>Henüz yorum yok</Text>
            <Text style={styles.emptySub}>Müşteriler yorum bıraktığında burada görünür</Text>
          </View>
        }
        renderItem={({ item }) => {
          const name = item.profiles?.full_name || item.profiles?.email || 'Misafir';
          const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
          return (
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarText}>{initials}</Text>
                </View>
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewName}>{name}</Text>
                  <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
                </View>
                <Stars rating={item.rating} />
              </View>
              {item.comment ? (
                <Text style={styles.reviewComment}>{item.comment}</Text>
              ) : null}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    flexDirection: 'row', gap: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  summaryLeft: { alignItems: 'center', justifyContent: 'center', minWidth: 80, gap: 4 },
  avgScore: { fontSize: 40, fontWeight: '900', color: '#0f172a' },
  totalCount: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: '500' },
  summaryRight: { flex: 1, justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: BRAND_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 13, fontWeight: '800', color: BRAND },
  reviewMeta: { flex: 1 },
  reviewName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  reviewDate: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  reviewComment: { fontSize: 13, color: '#374151', lineHeight: 20 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#64748b' },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
