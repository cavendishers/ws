from django.db import models

# ChatMessage模型已废弃并迁移到腾讯智能体API
# 原模型保留在 data_hall 应用中以维持数据库兼容性
# 新的AI聊天功能使用腾讯智能体API，不再需要本地数据库存储

# ai_assistant 应用不需要任何模型，所有功能通过API实现
# 如果将来需要添加AI相关的本地模型，请在此处添加
