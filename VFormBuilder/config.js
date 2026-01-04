import {
  ElCascader,
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElSlider,
  ElSwitch,
  ElTimePicker,
  ElTimeSelect,
  ElTreeSelect,
} from 'element-plus'
import { isString } from 'lodash-es'

const formItemMap = new Map([
  ['input', ElInput],
  ['password', [ElInput, 'password']],
  ['textarea', [ElInput, 'textarea']],
  ['number', ElInputNumber],
  ['time', ElTimePicker],
  ['timeSelect', ElTimeSelect],
  ['date', [ElDatePicker, 'date']],
  ['daterange', [ElDatePicker, 'daterange']],
  ['cascader', ElCascader],
  ['datetime', [ElDatePicker, 'datetime']],
  ['slider', ElSlider],
  ['checkbox', ElCheckbox],
  ['checkboxGroup', ElCheckboxGroup],
  ['radio', ElRadio],
  ['radioGroup', ElRadioGroup],
  ['switch', ElSwitch],
  ['treeSelect', ElTreeSelect],
  ['select', ElSelect],
])

const haveFormItem = new Map([
  ['select', ElOption],
  ['radioGroup', ElRadio],
  ['checkboxGroup', ElCheckbox],
])

export const getFormItemComponent = (type) => {
  if (type && !isString(type))
    return type
  // @ts-expect-error
  return (type && formItemMap.get(type)) || formItemMap.get('input')
}

export const getItemOption = (type) => {
  if (type && !isString(type))
    return type
    // @ts-expect-error
  return (type && haveFormItem.get(type)) || haveFormItem.get('select')
}
