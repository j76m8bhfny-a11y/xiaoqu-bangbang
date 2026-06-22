Feature: 小区认证
  用户上传材料完成小区认证，通过OCR+AI匹配验证。

  Scenario: 提交认证申请
    Given 用户已登录且未认证
    When 提交认证材料(房产证、文件URL、勾选授权)
    Then 创建认证记录，状态为pending
    And 调用OCR识别材料
    And 调用AI匹配小区

  Scenario: 认证通过
    Given OCR和AI匹配均通过
    Then 认证状态变为approved
    And 用户在community_members的verify_status变为verified

  Scenario: 认证需要人工复核
    Given OCR或AI匹配置信度不足
    Then 认证状态变为manual_review

  Scenario: 查询我的认证状态
    Given 用户已提交认证
    When 请求 GET /verifications/me
    Then 返回认证状态和脱敏摘要
    And 不返回原图URL
