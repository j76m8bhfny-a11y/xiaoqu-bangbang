"""Page Object: 登录页"""
from minium import MiniMinium

class LoginPage:
    def __init__(self, app: MiniMinium):
        self.app = app

    def get_login_button(self):
        """获取微信登录按钮"""
        return self.app.page.element(".login__btn")

    def is_login_page(self):
        """判断是否在登录页"""
        return self.app.page.path == "/pages/login/index"

    def get_title_text(self):
        """获取标题文本"""
        title = self.app.page.element(".login__title")
        if title:
            return title.inner_text
        return ""