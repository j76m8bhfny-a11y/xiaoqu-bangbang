Feature: OCR Mock服务
  首版OCR使用mock adapter，模拟房产证/租房合同/门禁卡识别。

  Scenario: OCR识别房产证返回匹配结果
    When 上传房产证材料进行OCR
    Then 返回识别结果包含小区名称、地址、姓名
    And 包含置信度字段

  Scenario: OCR识别结果与所选小区匹配
    Given OCR识别的小区名称与用户选择的小区一致
    Then AI匹配结果为approved

  Scenario: OCR识别结果与所选小区不匹配
    Given OCR识别的小区名称与用户选择的小区不一致
    Then AI匹配结果为manual_review或rejected
