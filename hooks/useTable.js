/**
 * 表格数据源函数类型
 * @typedef {Function} GetDataFunction
 * @description 用于获取表格数据的异步函数，接收查询参数并返回包含数据的Promise
 * @param {object} [params] - 查询参数对象
 * @returns {Promise<{data: any}>} 返回包含data字段的Promise对象
 */

/**
 * 分页配置接口
 * @typedef {object} PaginationConfig
 * @description 定义分页相关的参数和字段名称，用于控制分页行为和解析分页数据
 * @property {string} currentPageKey - 请求中当前页码的参数名
 * @property {string} pageSizeKey - 请求中每页条数的参数名
 * @property {string} dataField - 响应中数据字段的路径
 * @property {number} pageNum - 当前页码值
 * @property {number} pageSize - 每页条数值
 * @property {number} total - 数据总条数
 */

/**
 * 表格配置选项接口
 * @typedef {object} TableOptions
 * @description 用于自定义表格组件行为的可选参数
 * @property {object} [pagination] - 自定义分页配置，可覆盖默认配置
 * @property {boolean} [autoLoad=true] - 是否在初始化时自动加载数据
 * @property {boolean} [showLoading=true] - 是否显示加载状态
 * @property {boolean} [includePagination=true] - 请求参数中是否包含分页信息
 * @property {object} [searchParams] - 额外的查询参数，响应式对象
 */

/**
 * 表格状态接口
 * @typedef {object} TableState
 * @description 表格内部维护的响应式状态数据结构
 * @property {Array} data - 表格数据列表
 * @property {boolean} loading - 当前加载状态
 * @property {Error|null} error - 错误信息
 * @property {boolean} initialized - 是否已完成初始化
 */

/**
 * 表格返回值接口
 * @typedef {object} TableReturn
 * @description useTable 函数返回的所有属性和方法
 * @property {object} data - 表格数据，响应式
 * @property {object} loading - 加载状态，响应式
 * @property {object} error - 错误信息，响应式
 * @property {object} initialized - 初始化状态，响应式
 * @property {object | null} pagination - 分页配置，响应式
 * @property {Function} fetchData - 手动获取数据的方法
 * @property {Function} handlePageChange - 页码变更处理方法
 * @property {Function} handleSizeChange - 每页条数变更处理方法
 * @property {Function} reset - 重置表格数据和分页的方法
 */

/**
 * 快速创建一个表格数据处理的组合式函数
 * @description 处理表格数据获取、分页、加载状态等常见功能，减少重复代码
 * @param {GetDataFunction} getData - 获取数据的函数，返回一个Promise对象，通常是API调用
 * @param {TableOptions} [options] - 可选配置项，用于自定义表格行为
 * @param {Function} [options.onSuccess] - 数据获取成功后的回调函数，可用于额外的数据处理
 * @returns {TableReturn} 表格数据和表格操作方法的集合
 */

const useTable = (
  getData,
  options = {},
) => {
  // 默认配置
  const defaultConfig = {
    pagination: {
      currentPageKey: 'pageNum', // 请求中当前页码的参数名
      pageSizeKey: 'pageSize', // 请求中每页条数的参数名
      dataField: 'records', // 响应中数据字段的路径
      pageNum: 1, // 当前页码值
      pageSize: 15, // 每页条数值
      total: 0, // 数据总条数
    },
    autoLoad: true, // 是否在初始化时自动加载数据
    showLoading: true, // 是否显示加载状态
    includePagination: true, // 是否在请求参数中包含分页参数
  }

  /**
   * 配置合并
   * @description 优先级：默认配置 < 传入配置 < 查询参数
   */
  const config = reactive({
    pagination: {
      ...defaultConfig.pagination,
      ...(options.pagination || {}),
      ...options.searchParams?.value,
    },
    autoLoad: options.autoLoad !== false,
    showLoading: options.showLoading !== false,
    includePagination: options.includePagination !== false,
  })

  /**
   * 响应式状态
   * @description 维护表格的内部状态
   */
  const state = reactive({
    data: [], // 表格数据列表
    loading: false, // 当前加载状态
    error: null, // 错误信息
    initialized: false, // 是否已完成初始化
  })

  // 数据字段路径解析
  const getNestedData = (obj, path) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj)
  }

  /**
   * 暴露的分页信息
   * @description 创建响应式的分页对象
   */
  const pagination = config.pagination
    ? reactive({
        ...config.pagination,
      })
    : null

  // 包装 getData，确保频繁切换参数时自动取消上一次请求
  const getDataWithCancel = getData

  /**
   * 获取数据方法
   * @description 调用getData获取数据并处理结果
   * @returns {Promise<void>} 获取数据的Promise
   */
  const fetchData = async () => {
    if (!getData || typeof getData !== 'function') {
      throw new Error('getData must be a function')
    }
    state.loading = config.showLoading
    state.error = null
    try {
      const params = {
        ...(config.pagination && config.includePagination && {
          [config.pagination.currentPageKey]: pagination.pageNum,
          [config.pagination.pageSizeKey]: pagination.pageSize,
        }),
        ...(options.searchParams?.value || {}),
      }
      // 使用带取消功能的 getData
      const { data } = await getDataWithCancel(params)
      // 处理数据字段
      const resultData = config.pagination.dataField
        ? getNestedData(data, config.pagination.dataField)
        : data
      // 更新分页信息
      if (config.pagination && data?.total !== undefined) {
        pagination.total = data.total
      }
      state.data = resultData
      state.initialized = true
      // 调用成功回调
      if (typeof options.onSuccess === 'function') {
        options.onSuccess(resultData)
      }
    }
    catch (err) {
      state.error = err
      console.error('useTable error:', err)
    }
    finally {
      state.loading = false
    }
  }

  /**
   * 页码变更处理
   * @description 当页码变化时更新页码并重新获取数据
   * @param {number} page - 新的页码值
   * @returns {void}
   */
  const handlePageChange = (page) => {
    if (pagination) {
      pagination.pageNum = page
      fetchData()
    }
  }

  /**
   * 每页条数变更处理
   * @description 当每页条数变化时更新条数，重置页码并重新获取数据
   * @param {number} size - 新的每页条数
   * @returns {void}
   */
  const handleSizeChange = (size) => {
    if (pagination) {
      pagination.pageSize = size
      pagination.pageNum = 1
      fetchData()
    }
  }

  /**
   * 重置方法
   * @description 重置分页参数到初始状态并重新获取数据
   * @returns {void}
   */
  const reset = () => {
    if (pagination) {
      pagination.pageNum = 1
      pagination.pageSize = config.pagination.pageSize
    }
    fetchData()
  }

  // 自动加载
  if (config.autoLoad) {
    fetchData()
  }

  return {
    ...toRefs(state),
    pagination,
    fetchData,
    handlePageChange,
    handleSizeChange,
    reset,
  }
}

export default useTable
