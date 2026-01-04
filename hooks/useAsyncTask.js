import { get } from 'lodash-es'

/**
 * useAsyncTask - 用于异步任务的组合式函数
 * @param {Function} asyncFn - 异步请求函数，需返回Promise
 * @param {*} initialValue - 初始数据值
 * @param {object} [options] - 配置项
 * @param {string} [options.path] - 响应数据路径（默认'data'，支持多级如'data.list'）
 * @param {number} [options.delay] - 请求延迟（毫秒）
 * @param {*} [options.params] - 请求参数，可以为值或ref
 * @param {boolean} [options.immediate] - 是否立即执行
 * @param {Function} [options.onSuccess] - 成功回调 (data, params, response)
 * @param {Function} [options.onError] - 失败回调 (error, params)
 * @param {Function} [options.onFinally] - finally 回调 ()
 * @param {Function} [options.transform] - 自定义响应数据转换函数 (res) => any
 * @returns {{
 *   data: Ref,
 *   loading: Ref<boolean>,
 *   error: Ref<any>,
 *   execute: (overrideParams?: any) => Promise<{ data: Ref | undefined, error?: Ref, loading: Ref<boolean> }>,
 *   refresh: () => Promise<any>,
 *   reset: (val?: any) => void,
 *   cancel: () => void,
 *   params: Ref<any>
 * } & { [Symbol.iterator]: () => Iterator<Ref<any> | Function | Ref<boolean> | Ref<any>> }} 组合式返回对象, 支持数组和对象解构
 */
const useAsyncTask = (asyncFn, initialValue, options = {}) => {
  const {
    path = 'data',
    delay,
    params,
    immediate = true,
    onSuccess,
    onError,
    onFinally,
    transform,
  } = options

  const data = shallowRef(initialValue)
  const loading = ref(false)
  const error = shallowRef(null)
  const apiParams = ref(null)

  // 并发控制：仅允许最后一次请求更新状态
  let requestId = 0

  const resolveParams = overrideParams => (
    overrideParams !== undefined ? overrideParams : (isRef(params) ? params.value : params)
  )

  const execute = async (overrideParams) => {
    const currentId = ++requestId
    apiParams.value = resolveParams(overrideParams)
    error.value = null

    // 进入加载中（覆盖延时过程）
    loading.value = true

    if (delay) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    try {
      const res = await asyncFn(apiParams.value)

      // 如果不是最后一次请求，丢弃结果
      if (currentId !== requestId) {
        return { data: toRef(data, 'value'), loading, cancelled: true }
      }

      let next
      if (typeof transform === 'function') {
        next = transform(res)
      }
      else {
        // 使用 lodash get 方法获取数据，支持多级路径如 'data.list'
        next = get(res, path, {})
      }
      data.value = next

      // 成功回调
      if (typeof onSuccess === 'function')
        onSuccess(data.value, apiParams.value, res)

      return { data: toRef(data, 'value'), loading }
    }
    catch (e) {
      if (currentId === requestId) {
        error.value = e
        if (typeof onError === 'function')
          onError(e, apiParams.value)
      }
      return { error: toRef(error, 'value'), loading }
    }
    finally {
      if (currentId === requestId) {
        loading.value = false
        if (typeof onFinally === 'function')
          onFinally()
      }
    }
  }

  // 重新执行最近一次参数
  const refresh = () => execute(apiParams.value)

  // 重置数据与错误
  const reset = (val = initialValue) => {
    data.value = val
    error.value = null
  }

  // 取消当前请求（逻辑取消：阻止后续更新并结束 loading）
  const cancel = () => {
    requestId++
    loading.value = false
  }

  if (immediate) {
    execute(resolveParams())
  }

  const result = {
    data,
    execute,
    loading,
    error,
    refresh,
    reset,
    cancel,
    params: apiParams,
  }

  // 迭代器保持兼容：[data, execute, loading]，新增 error 作为第四位
  result[Symbol.iterator] = function* () {
    yield data
    yield execute
    yield loading
    yield error
  }

  return result
}

export default useAsyncTask
