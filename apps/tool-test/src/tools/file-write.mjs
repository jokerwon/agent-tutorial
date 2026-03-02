import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import fs from 'fs/promises'
import path from 'node:path'

export const writeFileTool = tool(
  async ({ filePath, content }) => {
    try {
      const dir = path.dirname(filePath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(filePath, content, 'utf-8')
      console.log(`[工具调用] write_file("${filePath}") - 成功写入 ${content.length} 字节`)
      return `文件写入成功: ${filePath}`
    } catch (error) {
      console.log(`[工具调用] write_file("${filePath}") - 错误: ${error.message}`)
      return `写入文件失败: ${error.message}`
    }
  },
  {
    name: 'write_file',
    description: '向指定路径写入文件内容，自动创建目录',
    schema: z.object({
      filePath: z.string().describe('文件路径'),
      content: z.string().describe('要写入的文件内容'),
    }),
  },
)
