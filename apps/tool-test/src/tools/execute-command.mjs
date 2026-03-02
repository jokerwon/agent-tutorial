import { spawn } from 'node:child_process'
import z from 'zod'
import { tool } from '@langchain/core/tools'

export const executeCommandTool = tool(
  async ({ command, workingDirectory }) => {
    const cwd = workingDirectory || process.cwd()
    console.log(`[工具调用] execute_command("${command}")${workingDirectory ? ` - 工作目录: ${workingDirectory}` : ''}`)

    return new Promise((resolve) => {
      // 解析命令和参数
      const [cmd, ...args] = command.split(' ')

      const child = spawn(cmd, args, {
        cwd,
        stdio: 'inherit', // 实时输出到控制台
        shell: true,
      })

      let errorMsg = ''

      child.on('error', (error) => {
        errorMsg = error.message
      })

      child.on('close', (code) => {
        if (code === 0) {
          console.log(`[工具调用] execute_command("${command}") - 执行成功`)
          const cwdInfo = workingDirectory
            ? `\n\n重要提示：命令在目录 "${workingDirectory}" 中执行成功。如果需要在这个项目目录中继续执行命令，请使用 workingDirectory: "${workingDirectory}" 参数，不要使用 cd 命令。`
            : ''
          resolve(`命令执行成功: ${command}${cwdInfo}`)
        } else {
          console.log(`[工具调用] execute_command("${command}") - 执行失败，退出码: ${code}`)
          resolve(`命令执行失败，退出码: ${code}${errorMsg ? '\n错误: ' + errorMsg : ''}`)
        }
      })
    })
  },
  {
    name: 'execute_command',
    description: '执行系统命令，支持指定工作目录，实时显示输出',
    schema: z.object({
      command: z.string().describe('要执行的命令'),
      workingDirectory: z.string().optional().describe('工作目录（推荐指定）'),
    }),
  },
)
