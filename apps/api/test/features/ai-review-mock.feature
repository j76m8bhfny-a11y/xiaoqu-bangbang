Feature: AI审核 Mock服务
  首版AI审核使用mock adapter，需要根据内容模拟不同审核结果。

  Scenario: 普通内容审核通过
    When 提交普通互助事件
    Then AI审核结果为pass
    And 事件状态变为open

  Scenario: 违规内容被拦截
    When 提交包含违规内容的事件
    Then AI审核结果为reject
    And 返回错误码42201

  Scenario: 敏感内容转人工复核
    When 提交公共反馈含隐私争议
    Then AI审核结果为manual_review
    And 事件状态变为pending_review
