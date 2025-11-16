from typing import Dict, Any, Optional, List
import hashlib
import mimetypes
from datetime import datetime

from app.services.pattern_service import analyze_file_content, detect_pii
from app.services.virus_total_service import VirusTotalService
from app.core.config import settings


class FileAnalysisService:
    """Comprehensive file analysis service combining pattern matching, PII detection, and VirusTotal scanning"""
    
    @staticmethod
    async def analyze_file(file_content: bytes, filename: str, file_text: Optional[str] = None) -> Dict[str, Any]:
        """
        Perform comprehensive file analysis including:
        - Pattern matching for sensitive/malicious files
        - PII detection in content
        - VirusTotal malware scanning
        - File metadata analysis
        """
        
        # Basic file information
        file_size = len(file_content)
        file_hash = hashlib.sha256(file_content).hexdigest()
        mime_type, _ = mimetypes.guess_type(filename)
        
        # Extract text content if not provided
        print(f" FILE_EXTRACTION: Extracting text content from file...")
        print(f" FILE_EXTRACTION: File size: {file_size} bytes")
        print(f" FILE_EXTRACTION: MIME type: {mime_type}")
        print(f" FILE_EXTRACTION: File text provided: {file_text is not None}")
        
        if file_text is None:
            try:
                file_text = file_content.decode('utf-8', errors='ignore')
                print(f" FILE_EXTRACTION: Successfully decoded file content")
                print(f" FILE_EXTRACTION: Decoded text length: {len(file_text)}")
                print(f" FILE_EXTRACTION: Decoded text preview: {file_text[:200]}...")
            except Exception as e:
                print(f" FILE_EXTRACTION: Failed to decode file content: {e}")
                file_text = ""
        else:
            print(f" FILE_EXTRACTION: Using provided file text")
            print(f" FILE_EXTRACTION: Provided text length: {len(file_text)}")
            print(f" FILE_EXTRACTION: Provided text preview: {file_text[:200]}...")
        
        # Perform pattern-based analysis
        print(f" FILE_EXTRACTION: Calling analyze_file_content with text...")
        pattern_analysis = analyze_file_content(file_text, filename)
        
        # VirusTotal analysis
        vt_analysis = await FileAnalysisService._perform_vt_analysis(file_content, filename, file_hash)
        
        # File size and type validation
        size_analysis = FileAnalysisService._analyze_file_size(file_size, filename)
        
        # Create processed pattern analysis for internal methods
        processed_pattern_analysis = {
            "isSensitiveFile": pattern_analysis["is_sensitive"],
            "isMaliciousFile": pattern_analysis["is_malicious"],
            "piiDetection": {
                "hasPII": bool(pattern_analysis["pii_detected"]),
                "count": len(pattern_analysis["pii_detected"]),
                "riskLevel": "high" if len(pattern_analysis["pii_detected"]) > 3 else "medium" if len(pattern_analysis["pii_detected"]) > 0 else "low",
                "items": pattern_analysis["pii_detected"]
            },
            "dangerousPatterns": pattern_analysis["dangerous_patterns"],
            "quickPatterns": [],  # Not used in current implementation
        }
        
        # Combine all analyses
        result = {
            "success": True,
            "filename": filename,
            "fileSize": file_size,
            "fileHash": file_hash,
            "mimeType": mime_type,
            "timestamp": datetime.utcnow().isoformat(),
            
            # Pattern analysis results
            "isSensitiveFile": processed_pattern_analysis["isSensitiveFile"],
            "isMaliciousFile": processed_pattern_analysis["isMaliciousFile"],
            "piiDetection": processed_pattern_analysis["piiDetection"],
            "dangerousPatterns": processed_pattern_analysis["dangerousPatterns"],
            "quickPatterns": processed_pattern_analysis["quickPatterns"],
            
            # VirusTotal results
            "virusTotalAnalysis": vt_analysis,
            
            # Size validation
            "sizeAnalysis": size_analysis,
            
            # Overall risk assessment
            "riskLevel": FileAnalysisService._calculate_overall_risk(processed_pattern_analysis, vt_analysis, size_analysis),
            "summary": FileAnalysisService._generate_summary(processed_pattern_analysis, vt_analysis, size_analysis),
            
            # Blocking recommendation
            "shouldBlock": FileAnalysisService._should_block_file(processed_pattern_analysis, vt_analysis, size_analysis),
            "blockReason": FileAnalysisService._get_block_reason(processed_pattern_analysis, vt_analysis, size_analysis)
        }
        
        return result
    
    @staticmethod
    async def _perform_vt_analysis(file_content: bytes, filename: str, file_hash: str) -> Dict[str, Any]:
        """Perform VirusTotal analysis if API key is available"""
        if not settings.VT_API_KEY:
            return {
                "enabled": False,
                "reason": "VirusTotal API key not configured",
                "isMalicious": False,
                "detectionCount": 0,
                "totalEngines": 0
            }
        
        try:
            # Try to get existing report first
            existing_report = await VirusTotalService.get_file_report(file_hash)
            if existing_report:
                stats = existing_report.get("data", {}).get("attributes", {}).get("stats", {})
                vt_summary = VirusTotalService.summarize_stats(stats)
                return {
                    "enabled": True,
                    "method": "existing_report",
                    "scanId": file_hash,
                    **vt_summary
                }
            
            # Upload file for analysis if no existing report
            analysis_id = await VirusTotalService.upload_file_and_get_analysis_id(file_content, filename)
            if analysis_id:
                analysis_result = await VirusTotalService.get_analysis(analysis_id)
                if analysis_result:
                    stats = analysis_result.get("data", {}).get("attributes", {}).get("stats", {})
                    vt_summary = VirusTotalService.summarize_stats(stats)
                    return {
                        "enabled": True,
                        "method": "new_analysis",
                        "scanId": analysis_id,
                        **vt_summary
                    }
            
            return {
                "enabled": True,
                "method": "upload_failed",
                "reason": "Failed to upload file to VirusTotal",
                "isMalicious": False,
                "detectionCount": 0,
                "totalEngines": 0
            }
            
        except Exception as e:
            return {
                "enabled": True,
                "method": "error",
                "reason": f"VirusTotal analysis failed: {str(e)}",
                "isMalicious": False,
                "detectionCount": 0,
                "totalEngines": 0
            }
    
    @staticmethod
    def _analyze_file_size(file_size: int, filename: str) -> Dict[str, Any]:
        """Analyze file size and determine if it's acceptable for scanning"""
        max_size = 32 * 1024 * 1024  # 32MB limit
        
        return {
            "sizeBytes": file_size,
            "sizeMB": round(file_size / (1024 * 1024), 2),
            "isTooLarge": file_size > max_size,
            "maxAllowedMB": 32,
            "reason": "File too large for security scanning" if file_size > max_size else None
        }
    
    @staticmethod
    def _calculate_overall_risk(pattern_analysis: Dict[str, Any], vt_analysis: Dict[str, Any], size_analysis: Dict[str, Any]) -> str:
        """Calculate overall risk level based on all analyses"""
        
        # High risk factors
        if (pattern_analysis["isMaliciousFile"] or 
            pattern_analysis["isSensitiveFile"] or 
            (pattern_analysis["dangerousPatterns"] and len(pattern_analysis["dangerousPatterns"]) > 0) or
            vt_analysis.get("isMalicious", False) or
            size_analysis["isTooLarge"]):
            return "high"
        
        # Medium risk factors
        if (pattern_analysis["piiDetection"]["hasPII"] or 
            pattern_analysis["quickPatterns"] or
            vt_analysis.get("detectionCount", 0) > 0):
            return "medium"
        
        # Low risk factors
        if (pattern_analysis["piiDetection"]["hasPII"] or 
            pattern_analysis["quickPatterns"]):
            return "low"
        
        return "safe"
    
    @staticmethod
    def _should_block_file(pattern_analysis: Dict[str, Any], vt_analysis: Dict[str, Any], size_analysis: Dict[str, Any]) -> bool:
        """Determine if file should be blocked based on analysis results"""
        print(f" BLOCK_DECISION: Evaluating blocking criteria...")
        print(f" BLOCK_DECISION: isMaliciousFile: {pattern_analysis['isMaliciousFile']}")
        print(f" BLOCK_DECISION: isSensitiveFile: {pattern_analysis['isSensitiveFile']}")
        print(f" BLOCK_DECISION: dangerousPatterns: {pattern_analysis['dangerousPatterns']}")
        print(f" BLOCK_DECISION: vt_isMalicious: {vt_analysis.get('isMalicious', False)}")
        print(f" BLOCK_DECISION: isTooLarge: {size_analysis['isTooLarge']}")
        print(f" BLOCK_DECISION: PII detection: {pattern_analysis['piiDetection']}")
        
        # Always block these critical conditions
        if (pattern_analysis["isMaliciousFile"] or 
            vt_analysis.get("isMalicious", False) or
            size_analysis["isTooLarge"]):
            print(f" BLOCK_DECISION: BLOCKING - Critical threat detected")
            return True
        
        # Block sensitive files only if they also have dangerous patterns or PII
        if pattern_analysis["isSensitiveFile"]:
            if (pattern_analysis["dangerousPatterns"] and len(pattern_analysis["dangerousPatterns"]) > 0) or pattern_analysis["piiDetection"]["hasPII"]:
                print(f" BLOCK_DECISION: BLOCKING - Sensitive file with dangerous content")
                return True
            else:
                print(f" BLOCK_DECISION: ALLOWING - Sensitive file but no dangerous content")
        
        # Block files with dangerous patterns
        if pattern_analysis["dangerousPatterns"] and len(pattern_analysis["dangerousPatterns"]) > 0:
            print(f" BLOCK_DECISION: BLOCKING - Dangerous patterns detected: {pattern_analysis['dangerousPatterns']}")
            return True
        
        # Block based on PII detection (configurable)
        pii_has_pii = pattern_analysis["piiDetection"]["hasPII"]
        pii_risk_level = pattern_analysis["piiDetection"]["riskLevel"]
        
        print(f" BLOCK_DECISION: PII check - hasPII: {pii_has_pii}, riskLevel: {pii_risk_level}")
        
        if pii_has_pii and pii_risk_level in ["high", "medium"]:
            print(f" BLOCK_DECISION: BLOCKING - PII detected with {pii_risk_level} risk")
            return True
        
        print(f" BLOCK_DECISION: ALLOWING - No blocking criteria met")
        return False
    
    @staticmethod
    def _get_block_reason(pattern_analysis: Dict[str, Any], vt_analysis: Dict[str, Any], size_analysis: Dict[str, Any]) -> Optional[str]:
        """Get the primary reason for blocking the file"""
        
        if pattern_analysis["isSensitiveFile"]:
            return "Sensitive file detected - contains secrets or credentials"
        
        if pattern_analysis["isMaliciousFile"]:
            return "Potentially dangerous executable file"
        
        if pattern_analysis["dangerousPatterns"]:
            return f"Dangerous patterns detected: {', '.join(pattern_analysis['dangerousPatterns'][:3])}"
        
        if vt_analysis.get("isMalicious", False):
            return f"Malware detected by {vt_analysis.get('detectionCount', 0)}/{vt_analysis.get('totalEngines', 0)} engines"
        
        if size_analysis["isTooLarge"]:
            return f"File too large ({size_analysis['sizeMB']}MB) for security scanning"
        
        if pattern_analysis["piiDetection"]["hasPII"]:
            return f"PII detected ({pattern_analysis['piiDetection']['count']} patterns)"
        
        return None
    
    @staticmethod
    def _generate_summary(pattern_analysis: Dict[str, Any], vt_analysis: Dict[str, Any], size_analysis: Dict[str, Any]) -> str:
        """Generate a human-readable summary of the analysis"""
        
        summary_parts = []
        
        if pattern_analysis["isSensitiveFile"]:
            summary_parts.append("sensitive filename")
        
        if pattern_analysis["isMaliciousFile"]:
            summary_parts.append("malicious file extension")
        
        if pattern_analysis["piiDetection"]["hasPII"]:
            summary_parts.append(f"PII detected ({pattern_analysis['piiDetection']['count']} patterns)")
        
        if pattern_analysis["dangerousPatterns"]:
            summary_parts.append(f"dangerous patterns ({len(pattern_analysis['dangerousPatterns'])} found)")
        
        if pattern_analysis["quickPatterns"]:
            summary_parts.append(f"quick patterns ({len(pattern_analysis['quickPatterns'])} found)")
        
        if vt_analysis.get("isMalicious", False):
            summary_parts.append(f"VirusTotal detections: {vt_analysis.get('detectionCount', 0)}/{vt_analysis.get('totalEngines', 0)}")
        
        if size_analysis["isTooLarge"]:
            summary_parts.append(f"file too large ({size_analysis['sizeMB']}MB)")
        
        return ", ".join(summary_parts) if summary_parts else "no risks detected"
    
    @staticmethod
    async def analyze_file_for_extension(file_content: bytes, filename: str, file_text: Optional[str] = None) -> Dict[str, Any]:
        """
        Simplified analysis specifically for extension integration
        Returns format compatible with extension's expected response
        """
        full_analysis = await FileAnalysisService.analyze_file(file_content, filename, file_text)
        
        # Return in extension-compatible format
        return {
            "success": full_analysis["success"],
            "error": None if full_analysis["success"] else "Analysis failed",
            "isMalicious": full_analysis["virusTotalAnalysis"].get("isMalicious", False),
            "detectionCount": full_analysis["virusTotalAnalysis"].get("detectionCount", 0),
            "totalEngines": full_analysis["virusTotalAnalysis"].get("totalEngines", 0),
            "threats": full_analysis["dangerousPatterns"] + full_analysis["quickPatterns"],
            "riskLevel": full_analysis["riskLevel"],
            "summary": full_analysis["summary"],
            "shouldBlock": full_analysis["shouldBlock"],
            "blockReason": full_analysis["blockReason"],
            "isSensitiveFile": full_analysis["isSensitiveFile"],
            "isMaliciousFile": full_analysis["isMaliciousFile"],
            "piiDetection": full_analysis["piiDetection"],
            "fileSize": full_analysis["fileSize"],
            "fileHash": full_analysis["fileHash"]
        }

