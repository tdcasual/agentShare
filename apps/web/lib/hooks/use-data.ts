'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseDataOptions<T> {
  initialData?: T
  onError?: (error: Error) => void
  retryCount?: number
  retryDelay?: number
}

interface UseDataReturn<T> {
  data: T | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  isRefreshing: boolean
}

export function useData<T>(
  fetcher: () => Promise<T>,
  options: UseDataOptions<T> = {}
): UseDataReturn<T> {
  const { 
    initialData, 
    onError, 
    retryCount = 3,
    retryDelay = 1000 
  } = options

  const [data, setData] = useState<T | undefined>(initialData)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const retryCountRef = useRef(0)
  const isMountedRef = useRef(true)

  const fetchData = useCallback(async (isRetry = false) => {
    if (!isMountedRef.current) return

    if (isRetry) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const result = await fetcher()
      if (isMountedRef.current) {
        setData(result)
        retryCountRef.current = 0
      }
    } catch (err) {
      if (!isMountedRef.current) return

      const error = err instanceof Error ? err : new Error(String(err))
      
      if (retryCountRef.current < retryCount) {
        retryCountRef.current++
        setTimeout(() => {
          if (isMountedRef.current) {
            fetchData(true)
          }
        }, retryDelay * retryCountRef.current)
        return
      }

      setError(error)
      onError?.(error)
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [fetcher, retryCount, retryDelay, onError])

  useEffect(() => {
    if (!initialData) {
      fetchData()
    }
    
    return () => {
      isMountedRef.current = false
    }
  }, [fetchData, initialData])

  const refetch = useCallback(() => fetchData(true), [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch,
    isRefreshing,
  }
}

// Hook for optimistic updates
export function useOptimistic<T>(
  initialData: T,
  mergeFn: (current: T, optimisticValue: Partial<T>) => T
) {
  const [data, setData] = useState<T>(initialData)
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set())

  const optimisticUpdate = useCallback(async (
    updateId: string,
    optimisticValue: Partial<T>,
    updateFn: () => Promise<void>
  ) => {
    const previousData = data
    
    // Apply optimistic update
    setPendingUpdates(prev => new Set(prev).add(updateId))
    setData(current => mergeFn(current, optimisticValue))

    try {
      await updateFn()
    } catch (error) {
      // Revert on error
      setData(previousData)
      throw error
    } finally {
      setPendingUpdates(prev => {
        const next = new Set(prev)
        next.delete(updateId)
        return next
      })
    }
  }, [data, mergeFn])

  return {
    data,
    setData,
    optimisticUpdate,
    hasPendingUpdates: pendingUpdates.size > 0,
    pendingUpdateCount: pendingUpdates.size,
  }
}

// Hook for infinite scroll
export function useInfiniteScroll<T>(
  fetcher: (page: number) => Promise<T[]>,
  options: { threshold?: number; initialPage?: number } = {}
) {
  const { threshold = 100, initialPage = 1 } = options
  
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(initialPage)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    setError(null)

    try {
      const newItems = await fetcher(page)
      
      if (newItems.length === 0) {
        setHasMore(false)
      } else {
        setItems(prev => [...prev, ...newItems])
        setPage(prev => prev + 1)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [fetcher, page, isLoading, hasMore])

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore()
        }
      },
      { rootMargin: `${threshold}px` }
    )

    observerRef.current.observe(element)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [loadMore, hasMore, isLoading, threshold])

  const reset = useCallback(() => {
    setItems([])
    setPage(initialPage)
    setHasMore(true)
    setError(null)
  }, [initialPage])

  return {
    items,
    isLoading,
    error,
    hasMore,
    loadMoreRef,
    reset,
    loadMore,
  }
}
