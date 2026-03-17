import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "LangChain.js 学习教程",
  description: "从零开始学习 LangChain.js Agent 开发的完整指南",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/#快速开始' },
      { text: 'GitHub', link: 'https://github.com/langchain-ai/langchainjs' }
    ],

    sidebar: [
      {
        text: '📖 开始学习',
        items: [
          { text: '项目简介', link: '/' },
          { text: '快速开始', link: '/#快速开始' },
          { text: '学习路径', link: '/#学习路径推荐' }
        ]
      },
      {
        text: '🎯 基础模块',
        collapsed: false,
        items: [
          { text: 'Tool 工具模块', link: '/apps/tool-test/index' },
          { text: 'Prompt Template 提示词模板', link: '/apps/prompt-template-test/index' },
          { text: 'Output Parser 输出解析器', link: '/apps/output-parser-test/index' },
          { text: 'Memory 对话记忆', link: '/apps/memory-test/index' }
        ]
      },
      {
        text: '🚀 进阶模块',
        collapsed: false,
        items: [
          { text: 'RAG 检索增强生成', link: '/apps/rag-test/index' },
          { text: 'Milvus 向量数据库', link: '/apps/milvus-test/index' },
          { text: 'Runnable 序列与链', link: '/apps/runnable-test/index' }
        ]
      },
      {
        text: '💡 实战案例',
        collapsed: false,
        items: [
          { text: 'NestJS + LangChain 集成', link: '/apps/hello-nest-langchain/index' }
        ]
      },
      {
        text: '📚 参考资料',
        items: [
          { text: '核心概念', link: '/#核心概念' },
          { text: '最佳实践', link: '/#最佳实践' },
          { text: '常见问题', link: '/#常见问题' },
          { text: '进阶资源', link: '/#进阶资源' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/langchain-ai/langchainjs' }
    ],

    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © 2024-present'
    },

    outline: {
      level: [2, 3],
      label: '目录'
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换'
            }
          }
        }
      }
    }
  }
})
