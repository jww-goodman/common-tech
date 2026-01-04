import { getDicts } from '@/api/common.js'

export function useDict(dictTypes) {
  const dicts = ref({})
  const loading = ref(false)
  const error = ref(null)

  const fetchDict = async (overrideParams) => {
    loading.value = true
    error.value = null
    try {
      const response = await getDicts(overrideParams ?? dictTypes)
      dicts.value = response.data || {}
    }
    catch (err) {
      error.value = err
    }
    finally {
      loading.value = false
    }
  }

  fetchDict()

  return {
    dicts,
    loading,
    error,
    fetchDict,
  }
}
