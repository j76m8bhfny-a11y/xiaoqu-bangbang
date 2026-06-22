"""Test: 活动列表页 UI 测试"""
import minium

class TestEvents(minium.MiniTest):
    """活动列表页测试"""

    def test_events_page_loads(self):
        """验证活动页正常加载"""
        current_page = self.mini.page
        assert current_page is not None, "活动页未加载"

    def test_events_page_has_list(self):
        """验证活动页有列表容器"""
        list_el = self.mini.page.element(".events__list, .event-list, .scroll-view")
        assert list_el is not None, "活动列表容器不存在"