// 用于取消上一个异步任务的自定义 hook
const noop = () => {}

/**
 * 包装异步任务，使其在每次调用时自动取消上一次未完成的任务。
 * @param {Function} asyncTask - 需要包装的异步任务函数，需返回 Promise。
 * @returns {Function} 包装后的异步任务函数。
 *
 * 用法示例：
 *
 * // 假设有一个异步请求函数 fetchData
 * const fetchData = (params) => axios.get('/api/data', { params });
 *
 * // 使用 useCancelTask 包装
 * const fetchDataWithCancel = useCancelTask(fetchData);
 *
 * // 在参数频繁切换时调用
 * fetchDataWithCancel({ id: 1 }).then(...);
 * fetchDataWithCancel({ id: 2 }).then(...); // 会自动取消上一次未完成的请求
 *
 * // 典型场景：搜索框输入时，参数频繁变化，避免接口并发和数据错乱
 *
 * @example
 * const fetchUser = (id) => axios.get(`/api/user/${id}`);
 * const fetchUserWithCancel = useCancelTask(fetchUser);
 * fetchUserWithCancel(1).then(...);
 * fetchUserWithCancel(2).then(...); // 只会保留最后一次请求
 */
const useCancelTask = (asyncTask) => {
  let cancelTask = noop // 记录上一次任务的取消函数
  return (...args) => {
    return new Promise((resolve, reject) => {
      cancelTask() // 调用上一次的取消函数，取消未完成的任务
      cancelTask = () => {
        resolve = reject = noop // 防止多次调用 resolve/reject
      }
      asyncTask(...args).then(
        res => resolve(res),
        err => reject(err),
      )
    })
  }
}

export default useCancelTask
