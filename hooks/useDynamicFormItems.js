import { getBindProcess, getBindProcessByReview } from '@/api/common.js'
import { getTaskNodeRoleUserInfo } from '@/api/flowable/public.js'
import usePublicStore from '@/store/modules/public.js'
import {
  DESIGN_FUNDS,
  DESIGN_REVIEW,
  GET_DYNAMIC_FORM_ITEMS_FIELD_MAP,
  OUTCOME_REVIEW,
  REQUIREMENTS_REVIEW,
  REVIEW_SPECIAL_NODE_TYPE,
  SPECIAL_NODE_TYPE,
} from '@/utils/publicConstant.js'
import GroupUser from '../components/SelectGroupUser/GroupUser.vue'

const apiMap = new Map([
  [DESIGN_FUNDS, getBindProcess],
  [DESIGN_REVIEW, getBindProcessByReview],
])

const publicStore = usePublicStore()

// 生成计划外的动态表单项
function creatUnplannedDynamicItemsToSelectFormItems(items, span, isPlan, type) {
  return items.map((item) => {
    return {
      type: 'input',
      span,
      field: `${item[GET_DYNAMIC_FORM_ITEMS_FIELD_MAP.value]}Names`,
      label: item[GET_DYNAMIC_FORM_ITEMS_FIELD_MAP.label],
      disabled: isPlan && isPlan === '1',
      clearable: true,
      onClick: () => {
        const { componentRef } = useDialog(
          GroupUser,
          {
            props: {
              mutiple: true,
              // 如果需求评审，则默认为按部门选择人员
              radioValue: type === REQUIREMENTS_REVIEW ? '1' : '2',
              isShowTab: type !== REQUIREMENTS_REVIEW,
            },
            isForm: false,
          },
          {
            props: {
              title: '人员选择',
              width: '80%',
            },
            showCancelButton: false,
            showConfirmButton: false,
            extraButtons: [
              {
                text: '确定',
                type: 'primary',
                onClick: async ({ close }) => {
                  const obj = {}
                  const { ids, names } = await componentRef.value.submitForm()
                  const namesField = `${item[GET_DYNAMIC_FORM_ITEMS_FIELD_MAP.value]}Names`
                  const keysField = item[GET_DYNAMIC_FORM_ITEMS_FIELD_MAP.value]
                  obj[keysField] = ids.join(',')
                  obj[namesField] = names.join(',')
                  publicStore.changeNowForm(obj)
                  close()
                },
              },
            ],
          },
        )
      },
    }
  })
}

function createWithinPlanDynamicItemsToSelectFormItems(items, span) {
  return items.map((item) => {
    // <editor-fold desc="根据返回的动态表单项，生成对应的表单项，并将选中的人员信息存储到公共store中">
    const obj = {}
    const namesField = `${item[GET_DYNAMIC_FORM_ITEMS_FIELD_MAP.value]}Names`
    const keysField = item[GET_DYNAMIC_FORM_ITEMS_FIELD_MAP.value]
    obj[keysField] = item[keysField]
    obj[namesField] = item[namesField]
    publicStore.changeNowForm(obj)
    // </editor-fold>
    return {
      type: 'input',
      disabled: true,
      span,
      field: namesField,
      label: item[GET_DYNAMIC_FORM_ITEMS_FIELD_MAP.label],
    }
  })
}

// 根据流程去生成动态表单的items和rules
function useDynamicFormItems({ itemSpan = 24, isPlan, type }) {
  const nodeTypeList = type === OUTCOME_REVIEW ? REVIEW_SPECIAL_NODE_TYPE : SPECIAL_NODE_TYPE
  const dynamicItemsData = ref([])
  /**
   * 获取计划外动态表单项
   */

  const queryUnplannedDynamicItems = async (id) => {
    if (!id)
      return
    const { data } = await getTaskNodeRoleUserInfo(id)
    dynamicItemsData.value = data.filter(item => !nodeTypeList.includes(item.key)) ?? []
    return Promise.resolve()
  }

  const withinPlanProcessInfo = shallowRef({})
  /**
   * 获取计划内动态表单项
   */
  const getBindProcessApi = apiMap.get(type)
  const queryWithinPlanDynamicItems = async (params) => {
    const { data } = await getBindProcessApi(params)
    dynamicItemsData.value = data?.list
    withinPlanProcessInfo.value = data
  }

  /**
   * 生成计划内动态表单项
   */
  const withinPlanDynamicItemsMap = computed(() => {
    return createWithinPlanDynamicItemsToSelectFormItems(dynamicItemsData.value, itemSpan)
  })

  /**
   * 生成计划外动态表单项
   */
  const unplannedDynamicItemsMap = computed(() => {
    return creatUnplannedDynamicItemsToSelectFormItems(dynamicItemsData.value, itemSpan, isPlan, type)
  })
  const dynamicRules = computed(() => {
    const rules = {}
    unplannedDynamicItemsMap.value.forEach((item) => {
      if (item.field && item.field !== 'category') {
        rules[item.field] = [{ required: (isPlan && isPlan === 1) || !isPlan, message: `请选择${item.label}`, trigger: ['blur', 'change'] }]
      }
    })
    return rules
  })

  return {
    dynamicItemsData,
    queryUnplannedDynamicItems,
    queryWithinPlanDynamicItems,
    unplannedDynamicItemsMap,
    withinPlanDynamicItemsMap,
    dynamicRules,
    withinPlanProcessInfo,
  }
}

export default useDynamicFormItems
