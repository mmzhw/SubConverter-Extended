export default {
  app: { title: 'SubConverter 配置组装', subtitle: '可视化组装你的订阅链接', kicker: '订阅转换工作台', ready: '已生成', waiting: '待输入' },
  form: {
    target: '节点类型', sourceUrl: '订阅源地址',
    sourceUrlPlaceholder: 'https://订阅地址/...', sourceUrlInvalid: '请输入合法的 http(s) 地址',
    sourceUrlHelp: '填写原始机场订阅或节点订阅地址。也可以使用支持的前缀，例如 provider:HK,interval:21600,https://example.com/sub 来指定 Provider 名称和更新间隔。',
    primaryTitle: '节点类型与订阅源',
    savePreset: '保存为预设', importLink: '导入现有链接',
    backendBase: '自定义后端地址', backendBasePlaceholder: '留空自动使用当前页面地址',
    backendBaseHelp: '指定要请求的 SubConverter 后端地址。留空时会自动使用当前页面的协议、IP 和端口生成完整订阅 URL；本地或远程调试时也可以填其他后端地址。',
    groups: { node: '节点选项', rule: '规则选项', advanced: '高级选项' },
  },
  preview: { title: '生成的订阅 URL', kicker: '实时预览', ready: '可复制', emptyState: '未生成', copy: '复制', copied: '已复制！', copyFailed: '复制失败', qr: '二维码', qrEmpty: '输入订阅源后生成二维码' },
  presets: { title: '预设', empty: '暂无预设', load: '加载', delete: '删除', savePrompt: '预设名称', saved: '预设已保存', storageUnavailable: '浏览器存储不可用，预设无法保存' },
  import: { title: '导入现有链接', placeholder: '粘贴已有的 /sub?... 链接', invalid: '不是合法的 subconverter 订阅链接', unknownKept: '已保留未知参数' },
  common: { lang: 'EN', cancel: '取消', confirm: '确定' },
};
