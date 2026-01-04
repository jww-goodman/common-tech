import { ElMessage } from 'element-plus'
import { getDefaultModel, getOcfFilePath } from '@/api/Gstar/index'
import DocsFileViewer from '@/components/DocsFileViewer/index.vue'
import Gstar from '@/components/Gstar/Render.vue'
import SuperMap from '@/components/SuperMap/SuperMap.vue'
import useProjectStore from '@/store/modules/project.js'
import useUserStore from '@/store/modules/user.js'
import {
  CAD_FILE_MAP,
  CAN_VIEW_ONLINE_FILE,
  DOCS_FILE_EXTENSIONS,
  NEED_ASSOCIATION_PRJ_FILE_EXTENSIONS,
  TEXT_FILE,
} from '@/utils/publicConstant.js'
import { getFileExtension } from '@/utils/publicUtils.js'

const userStore = useUserStore()
const { userInfo } = storeToRefs(userStore)
const project = useProjectStore()
const { projectInfo } = storeToRefs(project)

const dialogClass = {
  width: '98%',
  height: '98vh',
}

export default function useSeeFile({ props, emits, isHistory = false, notNeedCheckProcess = false }) {
  const handleViewModelFile = async (fileExtension, row) => {
    const type = NEED_ASSOCIATION_PRJ_FILE_EXTENSIONS.includes(fileExtension) || CAD_FILE_MAP.includes(fileExtension)
    const dialogContainerMap = new Map([
      [NEED_ASSOCIATION_PRJ_FILE_EXTENSIONS.includes(fileExtension), ['模型查看', SuperMap]],
      [CAD_FILE_MAP.includes(fileExtension), ['CAD查看', Gstar]],
    ])
    const [dialogTitle, dialogComponent] = dialogContainerMap.get(type)
    const demoocfurl = shallowRef(null)
    const msgInfo = shallowRef(null)
    if (dialogTitle === 'CAD查看') {
      demoocfurl.value = await getOcfFilePath({
        annexId: row?.annexId,
      })
      msgInfo.value = await getDefaultModel(row?.annexId)
    }
    useDialog(
      dialogComponent,
      {
        props: {
          row,
          processInfo: props.processInfo,
          demoocfurl: demoocfurl.value?.data,
          defaultModelUrl: msgInfo.value?.msg,
          isDesigner: props.isDesigner,
          isProfessionalReception: props.isProfessionalReception,
          isCurrentUser: props.isCurrentUser,
          annotationId: row?.componentId,
          modelIdentification: props.modelIdentification,
        },
        isForm: false,
      },
      {
        showConfirmButton: false,
        props: {
          title: dialogTitle,
          ...dialogClass,
          closed: () => {
            if (isHistory || !emits)
              return
            emits('refreshModelFileComments')
          },
        },
      },
    )
  }

  const creatPDFContainer = (row) => {
    // 服务地址
    const officeUrl = import.meta.env.VITE_APP_PDF_URL

    // 服务端口
    const port = import.meta.env.VITE_APP_PDF_PORT
    // 基础API地址
    const baseApi = import.meta.env.VITE_APP_BASE_API
    const fileUrl = `${baseApi}/file/download?fileName=${row?.serviceFileName}&url=${row?.url}`
    const annotationFileUrl = `${baseApi}/pdf/selectAnnotationById/${row?.annexId}`
    const annotationSaveUrl = `${baseApi}/pdf/saveAnnotation`
    const iframeParams = {
      '#ae_username': userInfo.value?.username,
      'ae_get_url': annotationFileUrl,
      'ae_post_url': annotationSaveUrl,
      'ae_project_id': projectInfo.value?.projectId,
      'ae_process_number': props.processInfo?.processOnlyNumber,
      'ae_annex_id': row?.annexId,
      'ae_model_identification': props.modelIdentification,
      'ae_approver_name': props.processInfo?.approverName,
    }
    const paramStr = Object.entries(iframeParams)
      .map(([key, val]) => `&${key}=${val}`)
      .join('')

    const iframeUrl = `http://${officeUrl}:${port}/web/viewer.html?file=${encodeURIComponent(fileUrl)}${paramStr}`
    return h(
      'iframe',
      {
        src: iframeUrl,
        class: 'wh-full',
      },
    )
  }
  // 查看PDF文件方法
  const handleViewPDF = (_, row) => {
    useDialog(
      creatPDFContainer(row),
      {
        isForm: false,
        props: {
          row,
        },
      },
      {
        showConfirmButton: false,
        props: {
          title: 'PDF查看',
          fullscreen: true,
          closed: () => {
            if (isHistory)
              return
            emits('refreshModelFileComments')
          },
        },
      },
    )
  }

  // 查看文档类文件方法
  const handleViewDocs = (_, row) => {
    const type = props.isCurrentUser ? 'edit' : 'view'
    const typeTitleMap = new Map([
      ['edit', '编辑文档'],
      ['view', '查看文档'],
    ])
    useDialog(
      DocsFileViewer,
      {
        props: {
          annexId: row?.annexId,
          editFlag: type,
        },
        isForm: false,
      },
      {
        showConfirmButton: false,
        props: {
          title: typeTitleMap.get(type),
          ...dialogClass,
        },
      },
    )
  }

  // 查看文件方法
  const seeFile = (row) => {
    const fileExtension = getFileExtension(row?.ext)
    // if (!props.processInfo) {
    //   ElMessage.warning('流程暂存状态下，文件无法在线查看')
    //   return

    if (!CAN_VIEW_ONLINE_FILE.includes(fileExtension)) {
      ElMessage.warning('该文件类型不支持在线查看，请下载后查看')
      return
    }

    if (NEED_ASSOCIATION_PRJ_FILE_EXTENSIONS.includes(fileExtension) && row?.progress !== 100 && !notNeedCheckProcess) {
      ElMessage.warning('模型文件正在解析中，请稍后查看')
      return
    }
    // 是否为模型文件
    const isModelFile = NEED_ASSOCIATION_PRJ_FILE_EXTENSIONS.includes(fileExtension) || CAD_FILE_MAP.includes(fileExtension)
    // 是否为文档类文件
    const isDocsFile = DOCS_FILE_EXTENSIONS.includes(fileExtension.toLowerCase()) || TEXT_FILE.includes(fileExtension.toLowerCase())
    // 是否为PDF文件
    const isPdfFile = fileExtension.toLowerCase() === '.pdf'
    // 判断文件类型，选择对应的处理方法
    const handlerType = isModelFile || isDocsFile || isPdfFile

    // 处理方法映射
    const handlerMap = new Map([
      [isModelFile, handleViewModelFile],
      [isPdfFile, handleViewPDF],
      [isDocsFile, handleViewDocs],
    ])

    // 获取并执行对应的处理方法
    const handler = handlerMap.get(handlerType)
    handler && handler(fileExtension, row)
  }

  return {
    seeFile,
  }
}
