import fs from 'fs/promises'
import { z } from 'zod'
import { tool } from '@langchain/core/tools'

export const listDirectoryTool = tool(
  async ({ directoryPath }) => {
    try {
      const files = await fs.readdir(directoryPath)
      console.log(`[工具调用] list_directory("${directoryPath}") - 找到 ${files.length} 个项目`)
      return `目录内容:\n${files.map((f) => `- ${f}`).join('\n')}`
    } catch (error) {
      console.log(`[工具调用] list_directory("${directoryPath}") - 错误: ${error.message}`)
      return `列出目录失败: ${error.message}`
    }
  },
  {
    name: 'list_directory',
    description: '列出指定目录下的所有文件和文件夹',
    schema: z.object({
      directoryPath: z.string().describe('目录路径'),
    }),
  },
)
