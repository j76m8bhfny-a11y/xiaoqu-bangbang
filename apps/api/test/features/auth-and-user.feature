Feature: 认证与用户
  用户通过微信登录获取JWT，可以查看和更新自己的信息。

  Scenario: 微信登录成功返回token
    When 使用有效微信code调用登录接口
    Then 返回JWT token和用户信息
    And 用户信息包含currentCommunityId

  Scenario: 未登录访问受保护接口
    When 不带token请求事件列表
    Then 返回40101未登录错误

  Scenario: 获取当前用户信息
    Given 用户已登录
    When 请求 GET /me
    Then 返回用户昵称、头像、当前小区、认证状态和角色

  Scenario: 更新用户信息
    Given 用户已登录
    When 请求 PATCH /me 更新昵称
    Then 昵称更新成功
