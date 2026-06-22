Feature: 小区数据隔离
  作为系统核心约束，每个小区的数据必须隔离。
  所有业务列表默认按 current_community_id 过滤，
  详情接口校验资源归属，业委会管理员不能跨小区操作。

  Background:
    Given 小区A 和小区B 已存在
    And 用户U1 的当前小区为小区A
    And 用户U2 的当前小区为小区B

  Scenario: 用户只能看到自己小区的事件列表
    Given 小区A 有3条事件
    And 小区B 有2条事件
    When 用户U1 请求事件列表
    Then 返回3条事件，全部属于小区A

  Scenario: 用户不能查看其他小区的事件详情
    Given 小区B 有一条事件E1
    When 用户U1 请求事件E1详情
    Then 返回404或403错误

  Scenario: 用户不能在其他小区发布事件
    When 用户U1 尝试向小区B发布事件
    Then 返回403错误

  Scenario: 业委会管理员只能管理自己小区
    Given 用户U1 是小区A的业委会管理员
    When 用户U1 尝试管理小区B的公告
    Then 返回403错误

  Scenario: 用户未选择小区时请求业务接口
    Given 用户U3 未选择任何小区
    When 用户U3 请求事件列表
    Then 返回错误码40301

  Scenario: 切换小区后数据上下文刷新
    Given 用户U1 的当前小区为小区A
    When 用户U1 切换当前小区为小区B
    And 用户U1 请求事件列表
    Then 返回小区B的事件
