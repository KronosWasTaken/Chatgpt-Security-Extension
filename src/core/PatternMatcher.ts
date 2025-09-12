export class PatternMatcher {
  private static readonly DANGEROUS_PATTERNS = new Set([
    'ignore previous instructions',
    'ignore all previous instructions', 
    'ignore your previous instructions',
    'disregard previous instructions',
    'forget previous instructions',
    'from now on',
    'you are now',
    'act as',
    'pretend to be',
    'roleplay as',
    'role play as',
    'jailbreak',
    'dan mode',
    'developer mode',
    'ignore safety',
    'bypass restrictions',
    'override instructions',
    'ignore instructions',
    'new instructions',
    'forget your role',
    'change your role',
    'ignore everything',
    'disregard everything',
    'system prompt',
    'override system',
    'bypass system',
    'ignore system',
    'disable safety',
    'no restrictions',
    'unlimited mode',
    'unrestricted mode',
    'uncensored mode'
  ])

  private static readonly QUICK_PATTERNS = new Set([
    'ignore previous instructions',
    'ignore all previous',
    'from now on',
    'you are now',
    'jailbreak',
    'dan mode',
    'ignore safety',
    'bypass restrictions'
  ])

  private static readonly SENSITIVE_FILE_PATTERNS = [
    /\.key$/i,
    /\.pem$/i,
    /\.crt$/i,
    /\.cer$/i,
    /\.p12$/i,
    /\.pfx$/i,
    /\.jks$/i,
    /\.keystore$/i,
    /config\.json$/i,
    /config\.yaml$/i,
    /config\.yml$/i,
    /config\.ini$/i,
    /config\.toml$/i,
    /secrets?\.json$/i,
    /secrets?\.yaml$/i,
    /secrets?\.yml$/i,
    /password/i,
    /credential/i,
    /auth\.json$/i,
    /token/i,
    /api[_-]?key/i,
    /service[_-]?account/i,
    /aws[_-]?config/i,
    /aws[_-]?credentials/i,
    /\.aws\//i,
    /gcloud/i,
    /azure/i,
    /kubeconfig/i,
    /\.kube\/config/i,
    /id_rsa/i,
    /id_ecdsa/i,
    /id_ed25519/i,
    /ssh_host_/i,
    /known_hosts/i,
    /authorized_keys/i,
    /database\.yml$/i,
    /database\.json$/i,
    /db\.conf$/i,
    /\.sql$/i,
    /dump\.sql$/i,
    /\.htpasswd$/i,
    /wp-config\.php$/i,
    /settings\.py$/i,
    /local_settings\.py$/i
  ]

  private static readonly MALICIOUS_EXTENSIONS = new Set([
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', 
    '.vbs', '.js', '.jar', '.ps1', '.sh', '.deb', 
    '.rpm', '.dmg', '.pkg', '.msi', '.app'
  ])

  static containsDangerousPattern(text: string): string | null {
    const lowerText = text.toLowerCase()
    
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (lowerText.includes(pattern)) {
        return pattern
      }
    }
    
    return null
  }

  static containsQuickPattern(text: string): string | null {
    const lowerText = text.toLowerCase()
    
    for (const pattern of this.QUICK_PATTERNS) {
      if (lowerText.includes(pattern)) {
        return pattern
      }
    }
    
    return null
  }

  static isSensitiveFile(fileName: string): boolean {
    const lowerFileName = fileName.toLowerCase()
    
    if (lowerFileName === '.env' || 
        lowerFileName.endsWith('.env') || 
        lowerFileName.includes('.env.')) {
      return true
    }
    
    return this.SENSITIVE_FILE_PATTERNS.some(pattern => pattern.test(lowerFileName))
  }

  static isMaliciousFile(fileName: string): boolean {
    const lowerFileName = fileName.toLowerCase()
    
    for (const ext of this.MALICIOUS_EXTENSIONS) {
      if (lowerFileName.endsWith(ext)) {
        return true
      }
    }
    
    return false
  }
}