"""Test: 登录页 UI 测试"""
import minium

class TestLogin(minium.MiniTest):
    """登录页测试"""

    def test_login_page_loads(self):
        """验证登录页正常加载"""
        current_page = self.app.get_current_page()
        assert current_page is not None, "页面未加载"
        assert current_page.path == "/pages/login/index", f"当前页面不是登录页: {current_page.path}"

    def test_login_page_has_title(self):
        """验证登录页标题存在"""
        page = self.app.get_current_page()
        title = page.get_element(".login__title")
        assert title is not None, "登录页标题不存在"

    def test_login_button_exists(self):
        """验证微信登录按钮存在"""
        page = self.app.get_current_page()
        btn = page.get_element(".login__btn")
        assert btn is not None, "微信登录按钮不存在"

    def test_login_button_has_text(self):
        """验证登录按钮有文本"""
        page = self.app.get_current_page()
        btn = page.get_element(".login__btn")
        assert btn is not None, "微信登录按钮不存在"
        text = btn.inner_text
        assert "微信" in text or "登录" in text, f"按钮文本异常: {text}"