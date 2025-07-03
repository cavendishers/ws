/**
 * Authentication Forms Enhancement
 * Provides client-side validation and better user experience
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize authentication form enhancements
    initLoginForm();
    initRegistrationForm();
    initPasswordResetForm();
    initPasswordStrengthIndicator();
    initFormValidation();
    initPasswordRequirements();
    initHTML5ValidationMessages();
    initUnifiedErrorSystem();
    handleServerErrors();
});

// 统一错误提示系统
function initUnifiedErrorSystem() {
    // 清理所有现有的错误提示样式
    const existingErrors = document.querySelectorAll('.error-message, .field-error');
    existingErrors.forEach(error => error.remove());
    
    // 为所有输入框添加统一的错误容器
    const allInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
    allInputs.forEach(input => {
        const formGroup = input.closest('.form-group');
        if (formGroup && !formGroup.querySelector('.unified-error-container')) {
            const errorContainer = document.createElement('div');
            errorContainer.className = 'unified-error-container';
            formGroup.appendChild(errorContainer);
        }
    });
}

function initLoginForm() {
    const loginForm = document.querySelector('form[action*="login"]') || 
                     document.querySelector('form:has(input[name="username"]):has(input[name="password"])');
    if (!loginForm) return;

    const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;

    loginForm.addEventListener('submit', function(e) {
        // 按DOM顺序验证字段
        const requiredInputs = Array.from(loginForm.querySelectorAll('input[required]'));
        let firstErrorField = null;
        let hasErrors = false;

        // 清除所有现有错误
        clearAllErrors(loginForm);
        
        // 按DOM顺序检查每个必填字段
        for (const input of requiredInputs) {
            if (!validateSingleField(input)) {
                hasErrors = true;
                if (!firstErrorField) {
                    firstErrorField = input;
                }
            }
        }

        if (hasErrors) {
            e.preventDefault();
            if (firstErrorField) {
                firstErrorField.focus();
                // 滚动到第一个错误字段
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>登录中...';
        
        // Reset button after 5 seconds in case of network issues
        setTimeout(() => {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }, 5000);
    });
}

function initRegistrationForm() {
    const registerForm = document.querySelector('form[action*="register"]') || 
                        document.querySelector('form:has(input[name="username"]):has(input[name="email"]):has(input[name="password1"])');
    if (!registerForm) return;

    const submitButton = registerForm.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;

    registerForm.addEventListener('submit', function(e) {
        // 按DOM顺序验证字段
        const requiredInputs = Array.from(registerForm.querySelectorAll('input[required]'));
        let firstErrorField = null;
        let hasErrors = false;

        // 清除所有现有错误
        clearAllErrors(registerForm);
        
        // 按DOM顺序检查每个必填字段
        for (const input of requiredInputs) {
            if (!validateSingleField(input)) {
                hasErrors = true;
                if (!firstErrorField) {
                    firstErrorField = input;
                }
            }
        }

        if (hasErrors) {
            e.preventDefault();
            if (firstErrorField) {
                firstErrorField.focus();
                // 滚动到第一个错误字段
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>注册中...';
        
        // Reset button after 5 seconds in case of network issues
        setTimeout(() => {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }, 5000);
    });
}

function initPasswordResetForm() {
    const resetForm = document.querySelector('form[action*="password_reset"]') || 
                     document.querySelector('form:has(input[name="email"]):not(:has(input[name="username"]))');
    if (!resetForm) return;

    const submitButton = resetForm.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;

    resetForm.addEventListener('submit', function(e) {
        // 验证邮箱字段
        const emailInput = resetForm.querySelector('input[name="email"]');
        let hasErrors = false;

        // 清除所有现有错误
        clearAllErrors(resetForm);
        
        if (emailInput && !validateSingleField(emailInput)) {
            hasErrors = true;
            e.preventDefault();
            emailInput.focus();
            return;
        }

        if (!hasErrors) {
            // Show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>发送中...';
            
            // Reset button after 5 seconds in case of network issues
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }, 5000);
        }
    });
}

// 新的密码要求提示系统
function initPasswordRequirements() {
    const passwordInput = document.querySelector('#id_password1');
    const requirementsPanel = document.querySelector('#password-requirements');
    
    if (!passwordInput || !requirementsPanel) return;
    
    // 常用密码列表（简化版）
    const commonPasswords = [
        'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
        '12345678', '111111', '1234567890', 'admin', 'welcome', 'login',
        'master', 'hello', 'guest', 'test', 'user', '000000', 'root'
    ];
    
    // 显示/隐藏要求面板
    passwordInput.addEventListener('focus', function() {
        requirementsPanel.classList.add('show');
        updatePasswordRequirements(this.value);
    });
    
    passwordInput.addEventListener('input', function() {
        updatePasswordRequirements(this.value);
        updatePasswordStrength(this.value);
    });
    
    passwordInput.addEventListener('blur', function() {
        // 延迟隐藏，让用户有时间看到最终状态
        setTimeout(() => {
            if (document.activeElement !== passwordInput) {
                if (this.value.length === 0) {
                    requirementsPanel.classList.remove('show');
                }
            }
        }, 200);
    });
    
    function updatePasswordRequirements(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[^A-Za-z0-9]/.test(password),
            common: !commonPasswords.some(common => 
                password.toLowerCase().includes(common.toLowerCase()) && password.length > 0
            )
        };
        
        // 更新每个要求的显示状态
        Object.keys(requirements).forEach(req => {
            const element = requirementsPanel.querySelector(`[data-requirement="${req}"]`);
            const icon = element?.querySelector('.password-requirement-icon i');
            
            if (element && icon) {
                if (requirements[req]) {
                    element.classList.add('valid');
                    icon.style.display = 'block';
                } else {
                    element.classList.remove('valid');
                    icon.style.display = 'none';
                }
            }
        });
        
        return requirements;
    }
}

function updatePasswordStrength(password) {
    const strengthFill = document.querySelector('#strength-fill');
    const strengthText = document.querySelector('#strength-text');
    
    if (!strengthFill || !strengthText) return;
    
    const strength = calculatePasswordStrength(password);
    const colors = {
        0: { bg: '#EF4444', text: '很弱' },
        1: { bg: '#F97316', text: '弱' },
        2: { bg: '#EAB308', text: '一般' },
        3: { bg: '#84CC16', text: '良好' },
        4: { bg: '#22C55E', text: '强' },
        5: { bg: '#16A34A', text: '很强' }
    };
    
    const level = Math.floor(strength.score);
    const color = colors[level];
    
    // Update bar
    strengthFill.style.backgroundColor = color.bg;
    strengthFill.style.width = `${(strength.score / 5) * 100}%`;
    
    // Update text
    strengthText.textContent = color.text;
    strengthText.style.color = color.bg;
}

function initPasswordStrengthIndicator() {
    // This function is now handled by initPasswordRequirements for the new design
    const passwordInput = document.querySelector('#id_password1');
    if (passwordInput) {
        // Additional validation for password confirmation
        const confirmInput = document.querySelector('#id_password2');
        if (confirmInput) {
            confirmInput.addEventListener('input', function() {
                validatePasswordMatch(passwordInput.value, this.value);
            });
        }
    }
}

function validatePasswordMatch(password1, password2) {
    const confirmInput = document.querySelector('#id_password2');
    if (!confirmInput) return;
    
    clearFieldError(confirmInput);
    
    if (password2.length > 0 && password1 !== password2) {
        showFieldError(confirmInput, '两次输入的密码不一致');
    }
}

function calculatePasswordStrength(password) {
    let score = 0;
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        numbers: /\d/.test(password),
        symbols: /[^A-Za-z0-9]/.test(password)
    };
    
    // Calculate score
    Object.values(checks).forEach(check => {
        if (check) score++;
    });
    
    // Bonus for longer passwords
    if (password.length >= 12) score += 0.5;
    if (password.length >= 16) score += 0.5;
    
    return {
        score: Math.min(score, 5),
        checks: checks
    };
}

function initFormValidation() {
    // Real-time validation for all forms
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input[required]');
        
        inputs.forEach(input => {
            // Add real-time validation on blur
            input.addEventListener('blur', function() {
                // 只在输入了内容后进行验证
                if (this.value.trim().length > 0) {
                    validateSingleField(this);
                }
            });
            
            input.addEventListener('input', function() {
                // Clear errors on input
                clearFieldError(this);
            });
        });
    });
}

function validateSingleField(field) {
    const value = field.value.trim();
    const fieldType = field.type;
    const fieldName = field.name;
    
    // Clear existing errors
    clearFieldError(field);
    
    // 检查必填字段
    if (field.hasAttribute('required') && !value) {
        let message = '此字段为必填项';
        if (fieldName === 'username') {
            message = '请输入用户名';
        } else if (fieldName === 'email') {
            message = '请输入邮箱地址';
        } else if (fieldName === 'password' || fieldName === 'password1') {
            message = '请设置密码';
        } else if (fieldName === 'password2') {
            message = '请确认密码';
        }
        showFieldError(field, message);
        return false;
    }
    
    // 如果字段为空，不进行进一步验证
    if (!value) {
        return true;
    }
    
    // Email validation
    if (fieldType === 'email' || fieldName === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError(field, '请输入有效的邮箱地址');
            return false;
        }
    }
    
    // Username validation
    if (fieldName === 'username') {
        if (value.length < 3) {
            showFieldError(field, '用户名至少需要3个字符');
            return false;
        }
        
        const usernameRegex = /^[\w\-\u4e00-\u9fa5]+$/;
        if (!usernameRegex.test(value)) {
            showFieldError(field, '用户名只能包含字母、数字、下划线、连字符和中文');
            return false;
        }
    }
    
    // Enhanced Password validation
    if (fieldName === 'password1') {
        const passwordErrors = [];
        
        if (value.length < 8) {
            passwordErrors.push('密码至少需要8个字符');
        }
        
        if (!/[A-Z]/.test(value)) {
            passwordErrors.push('需要包含大写字母');
        }
        
        if (!/[a-z]/.test(value)) {
            passwordErrors.push('需要包含小写字母');
        }
        
        if (!/\d/.test(value)) {
            passwordErrors.push('需要包含数字');
        }
        
        if (!/[^A-Za-z0-9]/.test(value)) {
            passwordErrors.push('需要包含特殊字符');
        }
        
        // 检查常用密码
        const commonPasswords = ['password', '123456', '123456789', 'qwerty', 'abc123'];
        if (commonPasswords.some(common => value.toLowerCase().includes(common))) {
            passwordErrors.push('请避免使用常用密码');
        }
        
        if (passwordErrors.length > 0) {
            showFieldError(field, passwordErrors.join('；'));
            return false;
        }
    }
    
    // Password confirmation validation
    if (fieldName === 'password2') {
        const password1 = document.querySelector('#id_password1') || document.querySelector('input[name="password1"]');
        if (password1 && value !== password1.value) {
            showFieldError(field, '两次输入的密码不一致');
            return false;
        }
    }
    
    return true;
}

// 统一的错误显示函数 - 收集所有错误到表单底部
function showFieldError(field, message) {
    // 标记字段有错误
    field.classList.add('field-error');
    field.setAttribute('data-error-message', message);
    
    // 延迟显示错误，允许其他验证完成
    setTimeout(() => {
        displayFormErrors(field.closest('form'));
    }, 10);
}

// 统一的错误清除函数
function clearFieldError(field) {
    // 移除输入框错误样式和数据
    field.classList.remove('field-error');
    field.removeAttribute('data-error-message');
    
    // 更新表单错误显示
    setTimeout(() => {
        displayFormErrors(field.closest('form'));
    }, 10);
}

// 清除表单所有错误
function clearAllErrors(form) {
    const fieldsWithErrors = form.querySelectorAll('.field-error');
    fieldsWithErrors.forEach(field => {
        field.classList.remove('field-error');
        field.removeAttribute('data-error-message');
    });
    
    // 隐藏错误显示区域
    hideFormErrors();
}

// 显示表单错误 - 在表单底部统一显示
function displayFormErrors(form) {
    if (!form) return;
    
    const fieldsWithErrors = form.querySelectorAll('.field-error[data-error-message]');
    
    if (fieldsWithErrors.length === 0) {
        hideFormErrors();
        return;
    }
    
    // 找到最后一个表单组，在其下方显示错误
    const formGroups = form.querySelectorAll('.form-group');
    const lastFormGroup = formGroups[formGroups.length - 1];
    
    if (!lastFormGroup) return;
    
    // 清除现有错误容器
    const existingContainer = lastFormGroup.querySelector('.unified-error-container');
    if (existingContainer) {
        existingContainer.remove();
    }
    
    // 创建新的错误容器
    const errorContainer = document.createElement('div');
    errorContainer.className = 'unified-error-container';
    
    // 收集所有错误消息并合并为一行显示
    const errorMessages = [];
    fieldsWithErrors.forEach(field => {
        const message = field.getAttribute('data-error-message');
        if (message) {
            errorMessages.push(message);
        }
    });
    
    if (errorMessages.length > 0) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'unified-error-message';
        // 将多个错误用分号分隔，在一行显示
        errorDiv.textContent = errorMessages.join('；');
        errorContainer.appendChild(errorDiv);
    }
    
    // 插入到最后一个表单组
    lastFormGroup.appendChild(errorContainer);
    
    // 显示动画
    setTimeout(() => {
        const errorMessage = errorContainer.querySelector('.unified-error-message');
        if (errorMessage) {
            errorMessage.classList.add('show');
        }
    }, 10);
}

// 隐藏表单错误
function hideFormErrors() {
    const errorContainers = document.querySelectorAll('.unified-error-container');
    errorContainers.forEach(container => {
        const errorMessage = container.querySelector('.unified-error-message');
        if (errorMessage) {
            errorMessage.classList.remove('show');
        }
        setTimeout(() => {
            container.remove();
        }, 250);
    });
}

function initHTML5ValidationMessages() {
    // 禁用默认的HTML5验证提示
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.setAttribute('novalidate', 'true');
    });
    
    // 清除自定义错误消息
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', function(e) {
            e.target.setCustomValidity('');
        });
        
        input.addEventListener('focus', function(e) {
            e.target.setCustomValidity('');
        });
    });
}

// 处理服务器端错误 - 将现有的Django错误信息转换为统一格式
function handleServerErrors() {
    // 查找页面中已存在的错误容器
    const existingErrorContainers = document.querySelectorAll('.unified-error-container');
    if (existingErrorContainers.length > 0) {
        // 找到表单
        const form = document.querySelector('form');
        if (form) {
            const formGroups = form.querySelectorAll('.form-group');
            const lastFormGroup = formGroups[formGroups.length - 1];
            
            if (lastFormGroup) {
                // 收集所有错误信息
                const allErrors = [];
                existingErrorContainers.forEach(container => {
                    const errorMessages = container.querySelectorAll('.unified-error-message');
                    errorMessages.forEach(msg => {
                        allErrors.push(msg.textContent.trim());
                    });
                    // 移除原有容器
                    container.remove();
                });
                
                // 在最后一个表单组下方创建统一错误显示
                if (allErrors.length > 0) {
                    const newErrorContainer = document.createElement('div');
                    newErrorContainer.className = 'unified-error-container';
                    
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'unified-error-message show';
                    // 将多个错误用分号分隔，在一行显示
                    errorDiv.textContent = allErrors.join('；');
                    newErrorContainer.appendChild(errorDiv);
                    
                    lastFormGroup.appendChild(newErrorContainer);
                }
            }
        }
    }
}

// Auto-hide Django messages after 5 seconds
setTimeout(() => {
    const messages = document.querySelectorAll('[class*="bg-red-600"], [class*="bg-green-600"], [class*="bg-blue-600"]');
    messages.forEach(message => {
        if (message.textContent.trim()) {
            message.style.transition = 'opacity 0.5s ease-out';
            message.style.opacity = '0';
            setTimeout(() => {
                message.style.display = 'none';
            }, 500);
        }
    });
}, 5000);
