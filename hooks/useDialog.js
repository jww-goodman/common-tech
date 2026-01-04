import { ElButton, ElDialog, ElMessage } from 'element-plus'
import { createApp, h, ref } from 'vue'
import MainLineTitle from '@/components/MainLineTitle/index.vue'
import { loadAppPlugins } from '@/utils/loadAppPlugins.js'

/**
 * 表单选项接口
 * @typedef {object} FormOptions
 * @description 表单组件配置选项
 * @property {string} submitFnName - 提交表单的方法名称，表单验证与提交的函数名
 */

/**
 * 组件选项接口
 * @typedef {object} ComponentOptions
 * @description 传入组件的配置选项
 * @property {object} [props] - 组件的属性对象，会传递给组件实例
 * @property {boolean} [isForm] - 传入的组件是否为表单组件
 * @property {FormOptions} [formOptions] - 如果是表单组件，对应的表单配置参数
 */

/**
 * 额外按钮接口
 * @typedef {object} ExtraButton
 * @description 底部额外按钮的配置
 * @property {string} text - 按钮显示的文本
 * @property {Function} onClick - 按钮点击事件处理函数
 * @property {string} [type] - 按钮类型，支持 Element Plus 的按钮类型，如 primary、success 等
 * @property {object} [props] - 传递给按钮组件的其他属性
 */

/**
 * 弹窗选项接口
 * @typedef {object} DialogOptions
 * @description 弹窗的配置选项
 * @property {object} [props] - 弹窗的属性，支持 Element Plus 的 DialogProps
 * @property {boolean} [showFooterSlot] - 是否显示底部操作区域
 * @property {boolean} [showCancelButton] - 是否显示取消按钮
 * @property {boolean} [showConfirmButton] - 是否显示确认按钮
 * @property {string} [cancelButtonText] - 取消按钮的文本，默认为"关闭"
 * @property {string} [confirmButtonText] - 确认按钮的文本，默认为"确认"
 * @property {*} [leftContent] - 底部左侧内容，可以是函数或其他内容
 * @property {Array<ExtraButton>} [extraButtons] - 额外的右侧按钮配置数组
 */

/**
 * 创建并显示一个自定义弹窗
 * @description 快速创建一个包含组件内容的弹窗，支持自定义底部按钮和交互行为
 * @param {import('vue').Component|null} component - 要在弹窗中渲染的组件，可以为null表示空弹窗
 * @param {ComponentOptions|undefined} componentOptions - 组件的选项配置
 * @param {DialogOptions} dialogOptions - 弹窗的选项配置
 * @returns {{componentRef: import('vue').Ref<any>}} 包含组件实例引用的对象
 */
const useDialog = (
  component,
  componentOptions,
  dialogOptions,
) => {
  const dialogVisible = ref(true)
  const confirmLoading = ref(false)
  const extraButtonsLoading = ref({})

  const { showFooterSlot = true, showCancelButton = true, showConfirmButton = true } = dialogOptions.props
  // 设置默认值
  dialogOptions = {
    showFooterSlot,
    showCancelButton,
    showConfirmButton,
    ...dialogOptions,
  }

  const defaultsProps = {
    draggable: true,
    destroyOnClose: true,
    minHeight: '400px',
  }

  const dialogProps = {
    ...defaultsProps,
    ...dialogOptions.props,
  }

  /**
   * 关闭弹窗
   * @description 设置弹窗可见性为false，触发关闭流程
   */
  const closeDialog = () => {
    dialogVisible.value = false
  }

  const componentRef = ref()

  /**
   * 确认按钮处理函数
   * @description 处理确认按钮点击事件，如果是表单组件则尝试调用提交方法
   * @returns {Promise<void>}
   */
  const handleConfirm = async () => {
    try {
      confirmLoading.value = true
      if (componentOptions?.isForm) {
        // 获取表单提交函数名称并调用
        const { submitFnName = 'submitForm', onSuccess = () => {}, successMsg = '操作成功' } = componentOptions.formOptions || {}
        if (componentRef.value && componentRef.value[submitFnName]) {
          const resData = await componentRef.value[submitFnName]()
          ElMessage.success(successMsg)
          onSuccess(resData)
          closeDialog()
        }
      }
    }
    catch (error) {
      console.error('确认操作出错：', error)
    }
    finally {
      confirmLoading.value = false
    }
  }

  /**
   * 创建底部插槽内容
   * @description 根据配置生成底部按钮和内容
   * @returns {import('vue').VNode|null} 底部插槽的虚拟DOM节点
   */
  const creatFooterSlots = () => {
    if (!dialogOptions.showFooterSlot)
      return null

    // 右侧按钮（确认、取消、其他）
    const rightButtons = []

    if (dialogOptions.showConfirmButton) {
      rightButtons.push(
        h(
          ElButton,
          {
            type: 'primary',
            class: 'cancel_btn',
            onClick: handleConfirm,
            loading: confirmLoading.value,
          },
          () => dialogOptions.confirmButtonText || '确认',
        ),
      )
    }

    if (dialogOptions.showCancelButton) {
      rightButtons.push(
        h(
          ElButton,
          {
            class: 'cancel_btn',
            onClick: closeDialog,
          },
          () => dialogOptions.cancelButtonText || '关闭',
        ),
      )
    }

    /**
     * 处理额外按钮点击事件
     * @param {Function} btnFun - 按钮点击处理函数
     * @param {number} index - 按钮索引
     * @returns {Promise<void>}
     */
    const handleExtraButtonClick = async (btnFun, index) => {
      try {
        extraButtonsLoading.value[index] = true
        await btnFun({ close: closeDialog })
      }
      catch (error) {
        console.error('额外按钮操作出错：', error)
      }
      finally {
        extraButtonsLoading.value[index] = false
      }
    }

    // 渲染额外的右侧按钮
    if (dialogOptions.extraButtons && Array.isArray(dialogOptions.extraButtons)) {
      dialogOptions.extraButtons.forEach((btn, index) => {
        // 初始化按钮loading状态
        if (extraButtonsLoading.value[index] === undefined) {
          extraButtonsLoading.value[index] = false
        }

        rightButtons.unshift(
          h(
            ElButton,
            {
              ...btn.props,
              class: 'cancel_btn',
              onClick: () => handleExtraButtonClick(btn.onClick, index),
              type: (btn.type || 'default'),
              loading: extraButtonsLoading.value[index],
            },
            () => btn.text,
          ),
        )
      })
    }

    // 左侧内容
    const leftContent = dialogOptions.leftContent
      ? h('div', { class: 'footer-left' }, [
          typeof dialogOptions.leftContent === 'function'
            ? dialogOptions.leftContent()
            : dialogOptions.leftContent,
        ])
      : null
    return h(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: leftContent ? 'space-between' : 'flex-end',
          alignItems: 'center',
          width: '100%',
        },
      },
      [
        leftContent,
        h('div', { class: 'footer-right', style: { display: 'flex', gap: '8px' } }, rightButtons),
      ],
    )
  }

  /**
   * 创建弹窗主体内容
   * @description 渲染传入的组件作为弹窗内容
   * @returns {import('vue').VNode|undefined} 弹窗内容的虚拟DOM节点
   */
  const createDialogDefaultSlot = () => {
    if (!component)
      return
    return h(
      'div',
      {
        style: {
          height: dialogProps?.height ? dialogProps?.height : '100%',
          maxHeight: !dialogProps.fullscreen ? '80vh' : 'calc( 100vh - 58px )',
          overflowY: !dialogProps.fullscreen ? 'auto' : 'hidden',
        },
      },
      h(component, { ...componentOptions?.props, ref: componentRef }),
    )
  }

  const creatHeaderSlots = () => {
    return h(
      MainLineTitle,
      { title: dialogOptions.props.title || '提示', size: 'small' },
    )
  }

  /**
   * 创建弹窗容器
   * @description 渲染完整的弹窗组件
   * @returns {import('vue').VNode} 弹窗的虚拟DOM节点
   */
  const dialogContainer = () => {
    // 创建基础样式对象
    const baseStyle = {
      resize: dialogProps.fullscreen ? 'none' : 'both',
      overflow: 'auto',
      minHeight: dialogProps.minHeight,
      minWidth: '300px',
      position: 'relative', // 为伪元素定位提供参考点
    }

    // 根据 fullscreen 状态决定是否添加调整大小图标的类名
    const customClass = dialogProps.fullscreen ? 'custom-dialog flex-c justify-between' : 'custom-dialog flex-c justify-between with-resize-icon'

    return h(
      ElDialog,
      {
        ...dialogProps,
        modelValue: dialogVisible.value,
        class: customClass,
        ref: 'customDialog',
        onClosed: () => {
          dialogOptions.props?.closed?.()
          // eslint-disable-next-line no-use-before-define
          unmount()
        },
        style: baseStyle,
      },
      {
        header: creatHeaderSlots,
        default: createDialogDefaultSlot,
        footer: !dialogProps.fullscreen ? creatFooterSlots : null,
      },
    )
  }

  const app = createApp(dialogContainer)
  const div = document.createElement('div')
  document.body.appendChild(div)

  /**
   * 卸载弹窗实例
   * @description 清理弹窗组件和DOM节点
   */
  const unmount = () => {
    app.unmount()
    document.body.removeChild(div)
  }
  loadAppPlugins(app)
  app.mount(div)

  return {
    componentRef,
    close: closeDialog,
  }
}

export default useDialog
