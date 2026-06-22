"""Page Object: 活动列表页"""
from minium import MiniMinium

class EventsPage:
    def __init__(self, app: MiniMinium):
        self.app = app

    def is_events_page(self):
        """判断是否在活动页"""
        return self.app.page.path == "/pages/events/index"

    def get_event_items(self):
        """获取活动列表项"""
        return self.app.page.elements(".event-card, .events__item")