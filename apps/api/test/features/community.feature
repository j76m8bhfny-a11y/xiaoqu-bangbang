Feature: 小区选择与社群入口
  用户可以选择当前小区，查看小区列表和社群入口。

  Scenario: 获取小区列表
    When 请求小区列表接口
    Then 返回小区列表包含名称、城市、区县、地址

  Scenario: 选择当前小区
    Given 用户已登录
    When 请求 POST /communities/select 选择小区A
    Then 用户的current_community_id更新为小区A

  Scenario: 认证居民可查看社群入口
    Given 用户已认证小区A
    And 小区A有一个verified_only社群入口
    When 用户请求小区A的社群入口
    Then 返回社群入口包含二维码和说明

  Scenario: 未认证用户不能查看verified_only社群入口
    Given 用户未认证小区A
    And 小区A有一个verified_only社群入口
    When 用户请求小区A的社群入口
    Then verified_only入口不在返回结果中
