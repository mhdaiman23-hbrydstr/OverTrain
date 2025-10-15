/**
 * Linear Progression Tier Service
 *
 * Service for fetching and managing linear progression tier configurations from database.
 * Features:
 * - Aggressive caching for fast lookups
 * - Fallback to heuristic-based tier selection
 * - Compatible with existing TierRules interface
 */

import { supabase } from '../supabase'
import type { TierRules, ProgressionTier } from '../progression-tiers'

// ============================================================================
// DATABASE TYPES (Match SQL schema)
// ============================================================================

export interface DbLinearProgressionTier {
  id: string
  tier_name: string
  min_increment: number
  weekly_increase: number
  adjustment_bounds: number
  max_rep_adjustment: number
  description: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class LinearProgressionTierService {
  private static instance: LinearProgressionTierService

  // Cache with TTL
  private cache = new Map<string, any>()
  private cacheTimestamps = new Map<string, number>()
  private readonly CACHE_TTL = 30 * 60 * 1000 // 30 minutes (tiers change rarely)

  static getInstance(): LinearProgressionTierService {
    if (!LinearProgressionTierService.instance) {
      LinearProgressionTierService.instance = new LinearProgressionTierService()
    }
    return LinearProgressionTierService.instance
  }

  private ensureSupabase() {
    if (!supabase) {
      console.warn('[LinearProgressionTierService] Supabase client not initialized')
      return false
    }
    return true
  }

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key)
    if (!timestamp) return false
    return Date.now() - timestamp < this.CACHE_TTL
  }

  private setCache(key: string, value: any): void {
    this.cache.set(key, value)
    this.cacheTimestamps.set(key, Date.now())
  }

  private getCache(key: string): any | null {
    if (!this.isCacheValid(key)) {
      this.cache.delete(key)
      this.cacheTimestamps.delete(key)
      return null
    }
    return this.cache.get(key) || null
  }

  clearCache(): void {
    this.cache.clear()
    this.cacheTimestamps.clear()
    console.log('[LinearProgressionTierService] Cache cleared')
  }

  // ==========================================================================
  // FETCH METHODS (With Caching)
  // ==========================================================================

  /**
   * Get all progression tiers
   * Performance: <5ms cached, <100ms uncached
   */
  async getAllTiers(): Promise<DbLinearProgressionTier[]> {
    const cacheKey = 'all_tiers'
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    if (!this.ensureSupabase()) return []

    try {
      const { data, error } = await supabase
        .from('linear_progression_tiers')
        .select('*')
        .order('tier_name')

      if (error) {
        console.error('[LinearProgressionTierService] Error fetching tiers:', error)
        return []
      }

      this.setCache(cacheKey, data || [])
      return data || []
    } catch (error) {
      console.error('[LinearProgressionTierService] Failed to fetch tiers:', error)
      return []
    }
  }

  /**
   * Get tier by UUID
   */
  async getTierById(id: string): Promise<DbLinearProgressionTier | null> {
    const cacheKey = `tier_id_${id}`
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    if (!this.ensureSupabase()) return null

    try {
      const { data, error } = await supabase
        .from('linear_progression_tiers')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.warn('[LinearProgressionTierService] Error fetching tier by id:', error)
        return null
      }

      if (data) {
        this.setCache(cacheKey, data)
      }
      return data
    } catch (error) {
      console.error('[LinearProgressionTierService] Failed to fetch tier by id:', error)
      return null
    }
  }

  /**
   * Get tier by name (e.g., "large_compound")
   */
  async getTierByName(tierName: string): Promise<DbLinearProgressionTier | null> {
    const cacheKey = `tier_name_${tierName}`
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    if (!this.ensureSupabase()) return null

    try {
      const { data, error } = await supabase
        .from('linear_progression_tiers')
        .select('*')
        .eq('tier_name', tierName)
        .maybeSingle()

      if (error) {
        console.warn('[LinearProgressionTierService] Error fetching tier by name:', error)
        return null
      }

      if (data) {
        this.setCache(cacheKey, data)
      }
      return data
    } catch (error) {
      console.error('[LinearProgressionTierService] Failed to fetch tier by name:', error)
      return null
    }
  }

  /**
   * Get tier rules for a specific exercise (via join with exercise_library)
   * Returns TierRules interface for compatibility with existing progression engines
   */
  async getTierRulesForExercise(exerciseId: string): Promise<TierRules | null> {
    const cacheKey = `exercise_tier_${exerciseId}`
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    if (!this.ensureSupabase()) return null

    try {
      // Join exercise_library with linear_progression_tiers
      const { data, error } = await supabase
        .from('exercise_library')
        .select(`
          linear_progression_tier_id,
          linear_progression_tiers:linear_progression_tier_id (
            id,
            tier_name,
            min_increment,
            weekly_increase,
            adjustment_bounds,
            max_rep_adjustment,
            description
          )
        `)
        .eq('id', exerciseId)
        .maybeSingle()

      if (error) {
        console.warn('[LinearProgressionTierService] Error fetching tier for exercise:', error)
        return null
      }

      // Check if exercise has a tier assigned
      if (!data || !data.linear_progression_tiers) {
        console.log(`[LinearProgressionTierService] Exercise ${exerciseId} has no tier assigned, will use fallback`)
        return null
      }

      // Convert to TierRules format
      const tier = data.linear_progression_tiers as any
      const tierRules: TierRules = {
        minIncrement: tier.min_increment,
        weeklyIncrease: tier.weekly_increase,
        adjustmentBounds: tier.adjustment_bounds,
        maxRepAdjustment: tier.max_rep_adjustment
      }

      this.setCache(cacheKey, tierRules)
      console.log(`[LinearProgressionTierService] Loaded tier rules for exercise ${exerciseId}:`, {
        tierName: tier.tier_name,
        rules: tierRules
      })

      return tierRules
    } catch (error) {
      console.error('[LinearProgressionTierService] Failed to fetch tier for exercise:', error)
      return null
    }
  }

  /**
   * Convert DbLinearProgressionTier to TierRules interface
   */
  convertToTierRules(dbTier: DbLinearProgressionTier): TierRules {
    return {
      minIncrement: dbTier.min_increment,
      weeklyIncrease: dbTier.weekly_increase,
      adjustmentBounds: dbTier.adjustment_bounds,
      maxRepAdjustment: dbTier.max_rep_adjustment
    }
  }

  /**
   * Get tier name for an exercise (useful for debugging/display)
   */
  async getTierNameForExercise(exerciseId: string): Promise<string | null> {
    if (!this.ensureSupabase()) return null

    try {
      const { data, error } = await supabase
        .from('exercise_library')
        .select(`
          linear_progression_tiers:linear_progression_tier_id (tier_name)
        `)
        .eq('id', exerciseId)
        .maybeSingle()

      if (error || !data) return null

      const tier = data.linear_progression_tiers as any
      return tier?.tier_name || null
    } catch (error) {
      console.error('[LinearProgressionTierService] Failed to fetch tier name:', error)
      return null
    }
  }

  // ==========================================================================
  // WARM CACHE (Call on app startup)
  // ==========================================================================

  /**
   * Preload all tiers into cache for instant performance
   */
  async warmCache(): Promise<void> {
    try {
      console.log('[LinearProgressionTierService] Warming cache...')
      const tiers = await this.getAllTiers()

      // Cache each tier by name as well
      for (const tier of tiers) {
        const cacheKey = `tier_name_${tier.tier_name}`
        this.setCache(cacheKey, tier)
      }

      console.log(`[LinearProgressionTierService] Cache warmed with ${tiers.length} tiers`)
    } catch (error) {
      console.error('[LinearProgressionTierService] Failed to warm cache:', error)
    }
  }

  // ==========================================================================
  // ADMIN OPERATIONS (For future tier management UI)
  // ==========================================================================

  async createTier(tier: Omit<DbLinearProgressionTier, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
    if (!this.ensureSupabase()) return null

    try {
      const { data, error } = await supabase
        .from('linear_progression_tiers')
        .insert({
          tier_name: tier.tier_name,
          min_increment: tier.min_increment,
          weekly_increase: tier.weekly_increase,
          adjustment_bounds: tier.adjustment_bounds,
          max_rep_adjustment: tier.max_rep_adjustment,
          description: tier.description
        })
        .select('id')
        .single()

      if (error) throw error

      this.clearCache() // Invalidate cache
      return data.id
    } catch (error) {
      console.error('[LinearProgressionTierService] Failed to create tier:', error)
      return null
    }
  }

  async updateTier(id: string, updates: Partial<DbLinearProgressionTier>): Promise<boolean> {
    if (!this.ensureSupabase()) return false

    try {
      const { error } = await supabase
        .from('linear_progression_tiers')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      this.clearCache() // Invalidate cache
      return true
    } catch (error) {
      console.error('[LinearProgressionTierService] Failed to update tier:', error)
      return false
    }
  }

  async deleteTier(id: string): Promise<boolean> {
    if (!this.ensureSupabase()) return false

    try {
      const { error } = await supabase
        .from('linear_progression_tiers')
        .delete()
        .eq('id', id)

      if (error) throw error

      this.clearCache() // Invalidate cache
      return true
    } catch (error) {
      console.error('[LinearProgressionTierService] Failed to delete tier:', error)
      return false
    }
  }
}

// Export singleton instance
export const linearProgressionTierService = LinearProgressionTierService.getInstance()
