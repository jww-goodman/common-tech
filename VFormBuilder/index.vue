<script setup>
import { getCurrentInstance, h } from 'vue'
import { getFormItemComponent, getItemOption } from './config.js'

defineOptions({
  name: 'VFormBuilder',
})

// 定义组件属性并设置默认值
const props = defineProps({
  /**
   * @typedef {object} IFormItem
   * @description 表单项
   * @template {object} T - 表单项属性的类型，默认为普通对象
   * @property {(string|function():import('vue').VNode)} [label] - 表单项 label
   * @property {string} field - 表单项绑定字段
   * @property {*} [placeholder] - 占位符
   * @property {boolean} [disabled] - 禁用标识
   * @property {T} [props] - 表单项属性，组件会将所有的D props 传递给 type 绑定的组件
   * @property {(string|import('vue').Component)} [type] - 组件类型，根据所传递的类型，动态渲染表单项，默认显示为 input 输入框
   * @property {number} [span] - 表单项栅格数
   * @property {string} [key] - 表单项唯一标识，未传递时会使用 field 作为唯一标识，若表单项中存在相同的 field 则必须传递 key
   * @property {boolean} [hidden] - 隐藏标识
   * @property {boolean} [required] - 是否必填
   * @property {object} [optionConfig] - 选项配置，用于下拉框、单选框组、复选框组等需要选项的组件
   * @property {Array} [optionConfig.data] - 选项数据数组，每项通常包含 label 和 value
   * @property {object} [optionConfig.props] - 传递给选项的额外属性
   * @property {object} [optionConfig.slots] - 选项的插槽配置
   */
  formItems: {
    type: Array,
    default: () => [], // 默认表单项为空数组
  },
  formConfig: {
    type: Object,
    default: () => ({
      labelWidth: '100px',
      labelPosition: 'right',
      size: 'default',
    }), // 默认表单配置为空对象
  },
  span: {
    type: Number,
    default: 24, // 默认列跨度为24
  },
  rules: {
    type: Object,
    default: () => ({}), // 默认验证规则为空对象
  },
})

const baseFieldReg = /^(?:type|label|props|on|span|key|hidden|required|rules|col|formProps)$/

// 定义表单数据模型
const formData = defineModel({
  default: () => ({}), // 默认值为空对象
})

// 默认标签宽度
const defaultLabelWidth = '80px'

// 计算表单项，过滤掉隐藏的项
const formItemsComputed = computed(() => {
  return props.formItems.filter(item => item.hidden !== true)
})

/**
 * 获取表单项属性
 */
function getFormItemProps(formItem) {
  const { formProps = {} } = formItem
  const { labelCol = {}, ...rest } = formProps
  const formLabelWidth = props?.formConfig?.labelCol?.style?.width ?? '120px'
  const labelWidth = labelCol?.style?.width === '0px' || !labelCol?.style?.width ? formLabelWidth : labelCol?.style?.width
  return {
    labelCol: {
      style: {
        labelWidth: labelWidth || defaultLabelWidth,
      },
    },
    ...rest, // 其他属性
  }
}

function creatItemOptionsSlots(formItem) {
  const { optionConfig: { data, slots, props, keyField = 'key', labelField = 'value' } } = formItem
  const itemOption = getItemOption(formItem.type)
  if (!data.length)
    return () => {}
  return () => {
    return data?.map((item, index) => {
      return h(itemOption, { value: item[keyField], label: item[labelField], key: item.value, ...props }, slots?.bind(null, item, index))
    })
  }
}

const selectType = new Set(['select', 'datePicker', 'time', 'treeSelect'])
const haveSlots = new Set(['radioGroup', 'checkboxGroup', 'select'])

function createItemSlots(formItem) {
  const isHaveSlots = haveSlots.has(formItem.type)
  return isHaveSlots
    ? {
        default: () => creatItemOptionsSlots(formItem)(),
        ...formItem.slots,
      }
    : formItem.slots || {}
}

const ComponentItem = {
  props: ['item'],
  setup(val) {
    const props = computed(() => {
      const merged = Object.keys(val?.item).reduce(
        (prev, key) => {
          if (!baseFieldReg.test(key)) {
            prev[key] = val?.item[key]
          }
          return prev
        },
        { ...val?.item.props, formData: formData.value },
      )
      if (!('placeholder' in merged)) {
        const { type, label } = val.item
        const text = selectType.has(type) ? '请选择' : '请输入'
        merged.placeholder = text + label
      }
      return merged
    })

    const tag = getFormItemComponent(val?.item.type)
    const tagIsArr = Array.isArray(tag) && tag.length > 0
    const itemComponent = tagIsArr ? tag[0] : tag
    const componentType = tagIsArr ? tag[1] : ''
    return () =>
      h(
        itemComponent,
        {
          ...props.value,
          'modelValue': formData.value[val?.item.field],
          'type': componentType || '', // 组件类型
          'prop': val?.item.field, // 绑定的字段
          'onUpdate:modelValue': (value) => {
            formData.value[val?.item.field] = value
          }, // 更新 modelValue
        },
        createItemSlots(val.item),
      )
  },
}

// 覆盖 Element Plus 的样式变量
const customStyleVariables = {
  '--el-disabled-text-color': '#333333',
  '--el-text-color-disabled': '#333333',
  '--el-disabled-bg-color': '#F7F8FA',
  '--el-fill-color-light': '#F7F8FA',
  '--el-disabled-border-color': '#DCE2ED',
}

// 将form表单的实例暴露出去
const currentInstance = getCurrentInstance()
const changeRef = (instance) => {
  currentInstance.exposed = currentInstance.exposeProxy = instance
}
</script>

<template>
  <el-form v-if="formItems.length" :ref="changeRef" :style="customStyleVariables" :model="formData" :rules="rules" v-bind="formConfig">
    <el-row>
      <el-col v-for="item of formItemsComputed" :key="item.field" class="px-[8px]" :span="item.span || span">
        <el-form-item :prop="item.field" v-bind="getFormItemProps(item)" :label="item.label">
          <slot :name="item.field">
            <ComponentItem :item="item" />
          </slot>
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>
</template>
