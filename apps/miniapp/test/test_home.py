"""Test: 首页 UI 测试"""
import minium

class TestHome(minium.MiniTest):
    """首页测试"""

    def test_home_page_loads(self):
        """验证首页正常加载"""
        current_page = self.mini.page
        assert current_page is not None, "首页未加载"

    def test_home_has_scroll_view(self):
        """验证首页有滚动区域"""
        scroll = self.mini.page.element(".home__scroll, .scroll-view")
        assert scroll is not None, "首页滚动区域不存在"

    def test_home_has_app_header(self):
        """验证首页有导航栏"""
        header = self.mini.page.element(".app-header")
        assert header is not None, "首页导航栏不存在"

    def test_home_has_fab_button(self):
        """验证首页有悬浮发布按钮"""
        fab = self.mini.page.element(".home__fab")
        assert fab is not None, "悬浮发布按钮不存在"