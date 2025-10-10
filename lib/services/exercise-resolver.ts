/**
 * Exercise Resolver Service
 *
 * Translates exercise identifiers (UUIDs, names, slugs) to Exercise objects from database.
 * Provides backwards compatibility for existing workout data that uses slugs.
 *
 * IMPORTANT: This is a READ-ONLY service. It does NOT modify workout logger functionality.
 * Templates can optionally use this to fetch exercise details from DB.
 */

import { exerciseService, type Exercise } from './exercise-library-service'

export class ExerciseResolver {
  private cache = new Map<string, Exercise>() // In-memory cache for performance
  private nameCache = new Map<string, Exercise>() // Cache by normalized name
  private cacheTimestamp = 0
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Resolve an exercise from various input formats
   *
   * @param input - Can be:
   *   - UUID: "a1b2c3d4-5678-90ab-cdef-1234567890ab"
   *   - Exercise name: "Barbell Bench Press"
   *   - Slug: "barbell-bench-press"
   * @returns Exercise object from database, or null if not found
   */
  async resolve(input: string): Promise<Exercise | null> {
    if (!input) return null

    // Clear cache if expired
    if (Date.now() - this.cacheTimestamp > this.CACHE_TTL) {
      this.cache.clear()
      this.nameCache.clear()
      this.cacheTimestamp = Date.now()
    }

    // Check cache first
    if (this.cache.has(input)) {
      return this.cache.get(input)!
    }

    try {
      // Strategy 1: Try as UUID
      if (this.isUUID(input)) {
        const exercise = await exerciseService.getExerciseById(input)
        if (exercise) {
          this.cacheExercise(input, exercise)
          return exercise
        }
      }

      // Strategy 2: Try as exact name match
      const exerciseByName = await exerciseService.getExerciseByName(input)
      if (exerciseByName) {
        this.cacheExercise(input, exerciseByName)
        return exerciseByName
      }

      // Strategy 3: Try as slug (convert to title case and search)
      if (this.isSlug(input)) {
        const possibleName = this.slugToName(input)
        const exerciseBySlug = await exerciseService.getExerciseByName(possibleName)
        if (exerciseBySlug) {
          this.cacheExercise(input, exerciseBySlug)
          return exerciseBySlug
        }
      }

      // Strategy 4: Try normalized name search
      const normalizedInput = this.normalizeName(input)
      if (this.nameCache.has(normalizedInput)) {
        const cached = this.nameCache.get(normalizedInput)!
        this.cache.set(input, cached)
        return cached
      }

      // Strategy 5: Fuzzy search by partial name match
      const allExercises = await this.getAllExercisesFromCache()
      for (const exercise of allExercises) {
        const normalizedExName = this.normalizeName(exercise.name)
        if (normalizedExName === normalizedInput) {
          this.cacheExercise(input, exercise)
          return exercise
        }
      }

      return null
    } catch (error) {
      console.error('[ExerciseResolver] Error resolving exercise:', error)
      return null
    }
  }

  /**
   * Batch resolve multiple exercises at once
   * More efficient than calling resolve() in a loop
   */
  async resolveMany(inputs: string[]): Promise<Map<string, Exercise | null>> {
    const results = new Map<string, Exercise | null>()

    // Try to resolve all in parallel
    const promises = inputs.map(async (input) => {
      const exercise = await this.resolve(input)
      return { input, exercise }
    })

    const resolved = await Promise.all(promises)

    for (const { input, exercise } of resolved) {
      results.set(input, exercise)
    }

    return results
  }

  /**
   * Get exercise by ID with caching
   * Optimized for UUID lookups
   */
  async getById(uuid: string): Promise<Exercise | null> {
    if (!this.isUUID(uuid)) return null

    if (this.cache.has(uuid)) {
      return this.cache.get(uuid)!
    }

    try {
      const exercise = await exerciseService.getExerciseById(uuid)
      if (exercise) {
        this.cacheExercise(uuid, exercise)
      }
      return exercise
    } catch (error) {
      console.error('[ExerciseResolver] Error getting exercise by ID:', error)
      return null
    }
  }

  /**
   * Get exercise by exact name
   */
  async getByName(name: string): Promise<Exercise | null> {
    const normalized = this.normalizeName(name)

    if (this.nameCache.has(normalized)) {
      return this.nameCache.get(normalized)!
    }

    try {
      const exercise = await exerciseService.getExerciseByName(name)
      if (exercise) {
        this.cacheExercise(name, exercise)
      }
      return exercise
    } catch (error) {
      console.error('[ExerciseResolver] Error getting exercise by name:', error)
      return null
    }
  }

  /**
   * Convert slug to proper exercise name
   * "barbell-bench-press" -> "Barbell Bench Press"
   */
  private slugToName(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Normalize name for comparison (lowercase, no extra spaces)
   */
  private normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ')
  }

  /**
   * Check if string is a valid UUID
   */
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  /**
   * Check if string looks like a slug (lowercase-with-dashes)
   */
  private isSlug(str: string): boolean {
    return /^[a-z0-9]+(-[a-z0-9]+)+$/.test(str)
  }

  /**
   * Cache an exercise under multiple keys for faster lookups
   */
  private cacheExercise(key: string, exercise: Exercise): void {
    this.cache.set(key, exercise)
    this.cache.set(exercise.id, exercise)

    const normalized = this.normalizeName(exercise.name)
    this.nameCache.set(normalized, exercise)
  }

  /**
   * Get all exercises (with caching)
   */
  private async getAllExercisesFromCache(): Promise<Exercise[]> {
    const cacheKey = '__all_exercises__'

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as unknown as Exercise[]
    }

    const exercises = await exerciseService.getAllExercises()
    this.cache.set(cacheKey, exercises as unknown as Exercise)

    // Pre-populate name cache
    for (const exercise of exercises) {
      const normalized = this.normalizeName(exercise.name)
      this.nameCache.set(normalized, exercise)
      this.cache.set(exercise.id, exercise)
    }

    return exercises
  }

  /**
   * Clear all caches (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cache.clear()
    this.nameCache.clear()
    this.cacheTimestamp = 0
  }

  /**
   * Pre-warm cache by loading all exercises
   * Call this on app startup for better performance
   */
  async warmCache(): Promise<void> {
    try {
      await this.getAllExercisesFromCache()
      console.log('[ExerciseResolver] Cache warmed successfully')
    } catch (error) {
      console.error('[ExerciseResolver] Failed to warm cache:', error)
    }
  }
}

// Export singleton instance
export const exerciseResolver = new ExerciseResolver()
