"""Page Object: 首页"""
from minium import MiniMinium

class HomePage:
    def __init__(self, app: MiniMinium):
        self.app = app

    def is_home_page(self):
        """判断是否在首页"""
        return self.app.page.path == "/pages/home/index"

    def get_community_name(self):
        """获取当前小区名称"""
        return self.app.page.element(".app-header__name")

    def scroll_to_events(self):
        """滑动到最新动态区域"""
        self.app.page.scroll(0, 300)

    def get_event_cards(self):
        """获取活动卡片列表"""
        return self.app.page.elements(".event-card")

    def click_fab_button(self):
        """点击悬浮发布按钮"""
        fab = self.app.page.element(".home__fab")
        if fab:
            fab.tap()

    def get_section_titles(self):
        """获取所有区块标题"""
        return self.app.page.elements(".section-header__title")