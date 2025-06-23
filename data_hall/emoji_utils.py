"""
Emoji处理工具模块
用于在后端正确处理包含表情符号的文本
"""
import re
import html
import logging

logger = logging.getLogger('ai_chat')


class EmojiProcessor:
    """表情符号处理器"""
    
    # 表情符号的Unicode范围
    EMOJI_PATTERNS = [
        r'[\U0001F600-\U0001F64F]',  # 表情符号
        r'[\U0001F300-\U0001F5FF]',  # 符号和象形文字
        r'[\U0001F680-\U0001F6FF]',  # 交通和地图符号
        r'[\U0001F1E0-\U0001F1FF]',  # 区域指示符
        r'[\U00002600-\U000026FF]',  # 杂项符号
        r'[\U00002700-\U000027BF]',  # 装饰符号
        r'[\U0001F900-\U0001F9FF]',  # 补充符号和象形文字
        r'[\U0001FA70-\U0001FAFF]',  # 符号和象形文字扩展-A
    ]
    
    @classmethod
    def encode_emojis_to_html(cls, text):
        """
        将表情符号编码为HTML实体
        
        Args:
            text (str): 包含表情符号的文本
            
        Returns:
            str: 编码后的文本
        """
        if not text:
            return text
            
        try:
            # 合并所有表情符号模式
            pattern = '|'.join(cls.EMOJI_PATTERNS)
            
            def replace_emoji(match):
                emoji = match.group(0)
                # 处理多字节Unicode字符，使用codePointAt等效方法
                code_points = []
                for char in emoji:
                    code_points.append(ord(char))
                
                # 如果是多个代码点，编码所有代码点
                if len(code_points) == 1:
                    return '&#' + str(code_points[0]) + ';'
                else:
                    # 对于复合emoji，编码所有代码点
                    return ''.join('&#' + str(cp) + ';' for cp in code_points)
            
            # 处理多字节emoji（如复合emoji）
            encoded_text = re.sub(pattern, replace_emoji, text, flags=re.UNICODE)
            
            logger.debug(f"表情符号编码: '{text}' -> '{encoded_text}'")
            return encoded_text
            
        except Exception as e:
            logger.warning(f"表情符号编码失败: {str(e)}, 原文本: {text}")
            return text
    
    @classmethod
    def decode_html_to_emojis(cls, text):
        """
        将HTML实体解码为表情符号
        
        Args:
            text (str): 包含HTML实体的文本
            
        Returns:
            str: 解码后的文本
        """
        if not text:
            return text
            
        try:
            # 匹配数字HTML实体 &#数字;
            def replace_entity(match):
                code_point = int(match.group(1))
                try:
                    return chr(code_point)
                except ValueError:
                    # 如果无法转换，保持原样
                    return match.group(0)
            
            decoded_text = re.sub(r'&#(\d+);', replace_entity, text)
            
            logger.debug(f"表情符号解码: '{text}' -> '{decoded_text}'")
            return decoded_text
            
        except Exception as e:
            logger.warning(f"表情符号解码失败: {str(e)}, 原文本: {text}")
            return text
    
    @classmethod
    def normalize_unicode(cls, text):
        """
        标准化Unicode文本，确保兼容性
        
        Args:
            text (str): 要标准化的文本
            
        Returns:
            str: 标准化后的文本
        """
        if not text:
            return text
            
        try:
            import unicodedata
            # 使用NFC标准化，这是推荐的Unicode标准化形式
            normalized = unicodedata.normalize('NFC', text)
            logger.debug(f"Unicode标准化: '{text}' -> '{normalized}'")
            return normalized
        except Exception as e:
            logger.warning(f"Unicode标准化失败: {str(e)}, 原文本: {text}")
            return text
    
    @classmethod
    def contains_emojis(cls, text):
        """
        检测文本是否包含表情符号
        
        Args:
            text (str): 要检测的文本
            
        Returns:
            bool: 是否包含表情符号
        """
        if not text:
            return False
            
        try:
            pattern = '|'.join(cls.EMOJI_PATTERNS)
            return bool(re.search(pattern, text))
        except Exception as e:
            logger.warning(f"表情符号检测失败: {str(e)}")
            return False
    
    @classmethod
    def sanitize_for_database(cls, text):
        """
        为数据库存储准备文本，确保表情符号兼容性
        
        Args:
            text (str): 要处理的文本
            
        Returns:
            str: 处理后的文本
        """
        if not text:
            return text
            
        try:
            # 1. 标准化Unicode
            text = cls.normalize_unicode(text)
            
            # 2. 如果包含表情符号，编码为HTML实体以确保数据库兼容性
            if cls.contains_emojis(text):
                text = cls.encode_emojis_to_html(text)
                logger.info("文本包含表情符号，已编码为HTML实体用于数据库存储")
            
            return text
            
        except Exception as e:
            logger.error(f"数据库文本预处理失败: {str(e)}, 原文本: {text}")
            return text
    
    @classmethod
    def prepare_for_display(cls, text):
        """
        为前端显示准备文本，解码表情符号
        
        Args:
            text (str): 要处理的文本
            
        Returns:
            str: 处理后的文本
        """
        if not text:
            return text
            
        try:
            # 解码HTML实体为表情符号
            text = cls.decode_html_to_emojis(text)
            
            # 标准化Unicode
            text = cls.normalize_unicode(text)
            
            return text
            
        except Exception as e:
            logger.error(f"显示文本预处理失败: {str(e)}, 原文本: {text}")
            return text


# 便捷函数，供其他模块直接使用
def encode_emojis(text):
    """编码表情符号为HTML实体"""
    return EmojiProcessor.encode_emojis_to_html(text)


def decode_emojis(text):
    """解码HTML实体为表情符号"""
    return EmojiProcessor.decode_html_to_emojis(text)


def sanitize_for_db(text):
    """为数据库存储准备文本"""
    return EmojiProcessor.sanitize_for_database(text)


def prepare_for_display(text):
    """为前端显示准备文本"""
    return EmojiProcessor.prepare_for_display(text) 