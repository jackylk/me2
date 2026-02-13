/**
 * Navigation 组件测试
 */
import { render, screen } from '@testing-library/react'
import Navigation from '@/components/Navigation'

// Mock usePathname
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('Navigation', () => {
  it('renders all navigation links', () => {
    render(<Navigation />)

    // 验证所有导航链接都存在
    expect(screen.getByText('聊天')).toBeInTheDocument()
    expect(screen.getByText('画像')).toBeInTheDocument()
    expect(screen.getByText('导入')).toBeInTheDocument()
    expect(screen.getByText('关心')).toBeInTheDocument()
    expect(screen.getByText('分析')).toBeInTheDocument()
    expect(screen.getByText('记忆')).toBeInTheDocument()
    expect(screen.getByText('图片')).toBeInTheDocument()
  })

  it('renders the Me2 logo', () => {
    render(<Navigation />)

    expect(screen.getByText('Me2')).toBeInTheDocument()
  })

  it('highlights active route', () => {
    render(<Navigation />)

    // 找到聊天链接
    const chatLink = screen.getByText('聊天').closest('a')

    // 验证当前页面（/）的链接被高亮
    expect(chatLink).toHaveClass('bg-blue-50')
    expect(chatLink).toHaveClass('text-blue-600')
  })

  it('renders correct number of links', () => {
    render(<Navigation />)

    // 应该有 8 个链接（包括 Logo 和 7 个导航项）
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(8)
  })
})
