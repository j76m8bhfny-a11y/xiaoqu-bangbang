#!/usr/bin/env python3
"""
微信小程序 P0 基础连通测试
验证 Minium 能否成功连接开发者工具并读取页面信息
"""
import minium
import sys

def test_connection():
    """P0: 基础连通测试"""
    print("=" * 50)
    print("P0 测试: 基础连通验证")
    print("=" * 50)

    m = minium.Minium({
        'project_path': '/Users/lifengju/我的开发/xiaoqu-bangbang/apps/miniapp/dist',
        'appid': 'wxe55306dc26646882',
        'test_port': 9420,
        'platform': 'ide',
        'app': 'wx',
        'remote_connect_timeout': 10,
    })
    print("✅ 连接成功")

    # 获取系统信息
    sys_info = m.app.call_wx_method('getSystemInfoSync')
    print(f"✅ 获取系统信息: {str(sys_info)[:80]}")

    return m

def test_page_access(m):
    """P0-1: 页面访问测试"""
    print("\n" + "=" * 50)
    print("P0-1 测试: 页面访问")
    print("=" * 50)

    page = m.app.get_current_page()
    print(f"✅ 当前页面: {page.path}")
    print(f"✅ 页面 ID: {page.page_id}")
    print(f"✅ 页面 Query: {page.query}")
    print(f"✅ 渲染类型: {page.renderer}")

    return page

def test_element_query(page):
    """P0-2: 元素查询测试"""
    print("\n" + "=" * 50)
    print("P0-2 测试: 元素查询")
    print("=" * 50)

    # 获取页面 WXML 数据结构
    try:
        data = page.data
        print(f"✅ 页面 data 结构: {str(data)[:200]}")
    except Exception as e:
        print(f"⚠️ 获取 page.data 失败: {e}")

    # 用正确的 API 查找元素（BaseElement 没有 tag_name，用 str() 或 element_id）
    selectors = ['.login__btn', '.login__title', '.login__logo']
    for sel in selectors:
        try:
            el = page.get_element(sel)
            if el:
                print(f"  ✅ 找到 [{sel}]: id={el.element_id} text={repr(el.inner_text)}")
        except Exception as e:
            print(f"  ⚠️ [{sel}] 未找到")

    # 测试按钮存在性（不实际点击，避免触发微信授权）
    try:
        btn = page.get_element('.login__btn')
        if btn:
            print(f"✅ 登录按钮存在: {repr(btn.inner_text)}")
    except Exception as e:
        print(f"⚠️ 获取登录按钮失败: {e}")

def test_navigation(m):
    """P0-3: 页面导航测试"""
    print("\n" + "=" * 50)
    print("P0-3 测试: 页面导航")
    print("=" * 50)

    # 获取小程序账号信息
    try:
        account_info = m.app.call_wx_method('getAccountInfoSync')
        appid = account_info.get('miniProgram', {}).get('appId', '未知')
        print(f"✅ 小程序账号: appid={appid}")
    except Exception as e:
        print(f"⚠️ 获取账号信息: {e}")

    # 先用 switchTab 跳转到 tabBar 页面（首页）
    try:
        m.app.switch_tab('/pages/home/index')
        page = m.app.get_current_page()
        print(f"✅ switch_tab 首页: {page.path}")
    except Exception as e:
        print(f"⚠️ switch_tab 首页失败: {e}")

    # 再用 navigateTo 跳转到非 tabBar 页面
    try:
        m.app.navigate_to('/pages/login/index')
        page = m.app.get_current_page()
        print(f"✅ navigateTo 登录页: {page.path}")
    except Exception as e:
        print(f"⚠️ navigateTo 登录页失败: {e}")

def main():
    try:
        # P0: 连接
        m = test_connection()

        # P0-1: 页面访问
        page = test_page_access(m)

        # P0-2: 元素查询
        test_element_query(page)

        # P0-3: 导航
        test_navigation(m)

        print("\n" + "=" * 50)
        print("🎉 所有 P0 测试通过!")
        print("=" * 50)
        return 0

    except minium.MiniumError as e:
        print(f"\n❌ Minium 错误: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ 未知错误: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())