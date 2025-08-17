/**
 * CollaborationManager.gs - Collaboration and sharing management features
 * Part of Sheet Shaper Google Sheets Add-on - Enhanced Version
 */

/**
 * Gets sharing information for the current spreadsheet
 * @return {Object} Sharing information and permissions
 */
function getSharingInfo() {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var file = DriveApp.getFileById(spreadsheet.getId());
    
    var sharingInfo = {
      spreadsheetId: spreadsheet.getId(),
      spreadsheetName: spreadsheet.getName(),
      owner: file.getOwner().getEmail(),
      sharingAccess: file.getSharingAccess(),
      sharingPermission: file.getSharingPermission(),
      editors: [],
      viewers: [],
      commenters: [],
      url: spreadsheet.getUrl()
    };
    
    // Get editors
    var editors = file.getEditors();
    sharingInfo.editors = editors.map(function(editor) {
      return {
        email: editor.getEmail(),
        name: editor.getName()
      };
    });
    
    // Get viewers
    var viewers = file.getViewers();
    sharingInfo.viewers = viewers.map(function(viewer) {
      return {
        email: viewer.getEmail(),
        name: viewer.getName()
      };
    });
    
    return sharingInfo;
    
  } catch (error) {
    handleError(error, 'getSharingInfo');
    return null;
  }
}

/**
 * Adds collaborators to the spreadsheet
 * @param {Array} collaborators - Array of collaborator objects with email and permission
 */
function addCollaborators(collaborators) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var file = DriveApp.getFileById(spreadsheet.getId());
    var results = [];
    
    collaborators.forEach(function(collaborator) {
      try {
        switch (collaborator.permission.toUpperCase()) {
          case 'EDIT':
            file.addEditor(collaborator.email);
            break;
          case 'COMMENT':
            file.addCommenter(collaborator.email);
            break;
          case 'VIEW':
            file.addViewer(collaborator.email);
            break;
          default:
            throw new Error('Invalid permission: ' + collaborator.permission);
        }
        
        results.push({
          email: collaborator.email,
          permission: collaborator.permission,
          status: 'success'
        });
        
      } catch (collabError) {
        results.push({
          email: collaborator.email,
          permission: collaborator.permission,
          status: 'error',
          error: collabError.message
        });
      }
    });
    
    var successCount = results.filter(function(r) { return r.status === 'success'; }).length;
    showToast('Added ' + successCount + ' collaborators successfully', 'Success');
    
    return results;
    
  } catch (error) {
    handleError(error, 'addCollaborators', { collaborators: collaborators });
    return [];
  }
}

/**
 * Removes collaborators from the spreadsheet
 * @param {Array} emails - Array of email addresses to remove
 */
function removeCollaborators(emails) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var file = DriveApp.getFileById(spreadsheet.getId());
    var results = [];
    
    emails.forEach(function(email) {
      try {
        file.removeEditor(email);
        file.removeCommenter(email);
        file.removeViewer(email);
        
        results.push({
          email: email,
          status: 'success'
        });
        
      } catch (removeError) {
        results.push({
          email: email,
          status: 'error',
          error: removeError.message
        });
      }
    });
    
    var successCount = results.filter(function(r) { return r.status === 'success'; }).length;
    showToast('Removed ' + successCount + ' collaborators successfully', 'Success');
    
    return results;
    
  } catch (error) {
    handleError(error, 'removeCollaborators', { emails: emails });
    return [];
  }
}

/**
 * Changes sharing settings for the spreadsheet
 * @param {Object} settings - Sharing settings configuration
 */
function updateSharingSettings(settings) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var file = DriveApp.getFileById(spreadsheet.getId());
    
    // Update sharing access and permission
    if (settings.sharingAccess && settings.sharingPermission) {
      var accessEnum = DriveApp.Access[settings.sharingAccess.toUpperCase()];
      var permissionEnum = DriveApp.Permission[settings.sharingPermission.toUpperCase()];
      
      file.setSharing(accessEnum, permissionEnum);
    }
    
    showToast('Sharing settings updated successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'updateSharingSettings', { settings: settings });
    return false;
  }
}

/**
 * Creates a shareable link with specific permissions
 * @param {string} permission - Permission level for the link (VIEW, COMMENT, EDIT)
 * @return {string} Shareable link
 */
function createShareableLink(permission) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var file = DriveApp.getFileById(spreadsheet.getId());
    
    // Set appropriate sharing for link
    var accessEnum = DriveApp.Access.ANYONE_WITH_LINK;
    var permissionEnum;
    
    switch (permission.toUpperCase()) {
      case 'VIEW':
        permissionEnum = DriveApp.Permission.VIEW;
        break;
      case 'COMMENT':
        permissionEnum = DriveApp.Permission.COMMENT;
        break;
      case 'EDIT':
        permissionEnum = DriveApp.Permission.EDIT;
        break;
      default:
        permissionEnum = DriveApp.Permission.VIEW;
    }
    
    file.setSharing(accessEnum, permissionEnum);
    
    var url = spreadsheet.getUrl();
    showToast('Shareable link created successfully', 'Success');
    
    return url;
    
  } catch (error) {
    handleError(error, 'createShareableLink', { permission: permission });
    return null;
  }
}

/**
 * Gets all comments in the current sheet
 * @return {Array} Array of comment objects
 */
function getSheetComments() {
  try {
    var sheet = getActiveSheet();
    var comments = [];
    
    // Note: Google Apps Script doesn't provide direct access to comments
    // This is a placeholder for comment functionality
    // In practice, comments would need to be managed through the Google Sheets UI
    
    return comments;
    
  } catch (error) {
    handleError(error, 'getSheetComments');
    return [];
  }
}

/**
 * Creates a comment on a specific cell
 * @param {string} cellAddress - A1 notation of the cell
 * @param {string} commentText - Text of the comment
 */
function addComment(cellAddress, commentText) {
  try {
    var sheet = getActiveSheet();
    var cell = sheet.getRange(cellAddress);
    
    // Add note to cell (closest equivalent to comments in Apps Script)
    cell.setNote(commentText);
    
    showToast('Comment added successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'addComment', { cellAddress: cellAddress, commentText: commentText });
    return false;
  }
}

/**
 * Gets revision history information
 * @return {Object} Revision history summary
 */
function getRevisionHistory() {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var file = DriveApp.getFileById(spreadsheet.getId());
    
    // Note: Detailed revision history is not directly accessible via Apps Script
    // This provides basic information available through the API
    
    var revisionInfo = {
      spreadsheetId: spreadsheet.getId(),
      lastModified: file.getLastUpdated(),
      dateCreated: file.getDateCreated(),
      size: file.getSize(),
      description: file.getDescription() || 'No description'
    };
    
    return revisionInfo;
    
  } catch (error) {
    handleError(error, 'getRevisionHistory');
    return null;
  }
}

/**
 * Creates a backup copy of the spreadsheet
 * @param {string} backupName - Name for the backup copy
 * @param {string} folderId - Optional folder ID to store the backup
 */
function createBackupCopy(backupName, folderId) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var file = DriveApp.getFileById(spreadsheet.getId());
    
    var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    var finalBackupName = backupName || (spreadsheet.getName() + ' - Backup ' + timestamp);
    
    var backupFile = file.makeCopy(finalBackupName);
    
    if (folderId) {
      var folder = DriveApp.getFolderById(folderId);
      folder.addFile(backupFile);
      DriveApp.getRootFolder().removeFile(backupFile);
    }
    
    showToast('Backup created successfully: ' + finalBackupName, 'Success');
    
    return {
      success: true,
      backupId: backupFile.getId(),
      backupName: finalBackupName,
      backupUrl: backupFile.getUrl()
    };
    
  } catch (error) {
    handleError(error, 'createBackupCopy', { backupName: backupName, folderId: folderId });
    return { success: false, error: error.message };
  }
}

/**
 * Sets up notification rules for the spreadsheet
 * @param {Object} notificationConfig - Notification configuration
 */
function setupNotifications(notificationConfig) {
  try {
    // Note: Google Apps Script doesn't provide direct notification management
    // This would typically be handled through Google Sheets' built-in notification system
    // This function serves as a placeholder for notification configuration
    
    var config = {
      emailNotifications: notificationConfig.emailNotifications || false,
      editNotifications: notificationConfig.editNotifications || false,
      commentNotifications: notificationConfig.commentNotifications || false,
      shareNotifications: notificationConfig.shareNotifications || false
    };
    
    // Store configuration in script properties for reference
    var properties = PropertiesService.getScriptProperties();
    properties.setProperty('notificationConfig', JSON.stringify(config));
    
    showToast('Notification settings updated', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'setupNotifications', { notificationConfig: notificationConfig });
    return false;
  }
}

/**
 * Gets collaboration analytics for the spreadsheet
 * @return {Object} Collaboration analytics data
 */
function getCollaborationAnalytics() {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var file = DriveApp.getFileById(spreadsheet.getId());
    var sharingInfo = getSharingInfo();
    
    var analytics = {
      totalCollaborators: 0,
      editorCount: 0,
      viewerCount: 0,
      commenterCount: 0,
      lastModified: file.getLastUpdated(),
      sharingLevel: file.getSharingAccess(),
      isPublic: file.getSharingAccess() === DriveApp.Access.ANYONE || 
                file.getSharingAccess() === DriveApp.Access.ANYONE_WITH_LINK,
      hasExternalCollaborators: false
    };
    
    if (sharingInfo) {
      analytics.editorCount = sharingInfo.editors.length;
      analytics.viewerCount = sharingInfo.viewers.length;
      analytics.commenterCount = sharingInfo.commenters.length;
      analytics.totalCollaborators = analytics.editorCount + analytics.viewerCount + analytics.commenterCount;
      
      // Check for external collaborators (outside organization domain)
      var ownerDomain = sharingInfo.owner.split('@')[1];
      var allCollaborators = sharingInfo.editors.concat(sharingInfo.viewers, sharingInfo.commenters);
      
      analytics.hasExternalCollaborators = allCollaborators.some(function(collaborator) {
        var collaboratorDomain = collaborator.email.split('@')[1];
        return collaboratorDomain !== ownerDomain;
      });
    }
    
    return analytics;
    
  } catch (error) {
    handleError(error, 'getCollaborationAnalytics');
    return null;
  }
}

/**
 * Manages sheet protection settings
 * @param {Object} protectionConfig - Protection configuration
 */
function manageSheetProtection(protectionConfig) {
  try {
    var sheet = getActiveSheet();
    var protection;
    
    if (protectionConfig.type === 'SHEET') {
      protection = sheet.protect();
    } else if (protectionConfig.type === 'RANGE') {
      var range = sheet.getRange(protectionConfig.range);
      protection = range.protect();
    } else {
      throw new Error('Invalid protection type');
    }
    
    if (protectionConfig.description) {
      protection.setDescription(protectionConfig.description);
    }
    
    if (protectionConfig.warningOnly) {
      protection.setWarningOnly(protectionConfig.warningOnly);
    }
    
    // Set editors if specified
    if (protectionConfig.editors && protectionConfig.editors.length > 0) {
      protection.removeEditors(protection.getEditors());
      protection.addEditors(protectionConfig.editors);
    }
    
    // Set domain edit permission
    if (protectionConfig.domainEdit !== undefined) {
      protection.setDomainEdit(protectionConfig.domainEdit);
    }
    
    showToast('Sheet protection updated successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'manageSheetProtection', { protectionConfig: protectionConfig });
    return false;
  }
}

/**
 * Removes protection from sheet or range
 * @param {string} protectionType - 'SHEET' or 'RANGE'
 * @param {string} range - A1 notation if removing range protection
 */
function removeProtection(protectionType, range) {
  try {
    var sheet = getActiveSheet();
    var protections;
    
    if (protectionType === 'SHEET') {
      protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    } else if (protectionType === 'RANGE') {
      protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    }
    
    protections.forEach(function(protection) {
      if (protectionType === 'RANGE' && range) {
        var protectedRange = protection.getRange();
        var targetRange = sheet.getRange(range);
        if (protectedRange.getA1Notation() === targetRange.getA1Notation()) {
          protection.remove();
        }
      } else if (protectionType === 'SHEET') {
        protection.remove();
      }
    });
    
    showToast('Protection removed successfully', 'Success');
    return true;
    
  } catch (error) {
    handleError(error, 'removeProtection', { protectionType: protectionType, range: range });
    return false;
  }
}

/**
 * Gets current protection status
 * @return {Object} Protection status information
 */
function getProtectionStatus() {
  try {
    var sheet = getActiveSheet();
    var sheetProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    var rangeProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    
    var status = {
      sheetProtected: sheetProtections.length > 0,
      rangeProtections: [],
      sheetProtectionDetails: null
    };
    
    if (status.sheetProtected) {
      var sheetProtection = sheetProtections[0];
      status.sheetProtectionDetails = {
        description: sheetProtection.getDescription(),
        isWarningOnly: sheetProtection.isWarningOnly(),
        editors: sheetProtection.getEditors().map(function(editor) {
          return editor.getEmail();
        })
      };
    }
    
    status.rangeProtections = rangeProtections.map(function(protection) {
      return {
        range: protection.getRange().getA1Notation(),
        description: protection.getDescription(),
        isWarningOnly: protection.isWarningOnly(),
        editors: protection.getEditors().map(function(editor) {
          return editor.getEmail();
        })
      };
    });
    
    return status;
    
  } catch (error) {
    handleError(error, 'getProtectionStatus');
    return null;
  }
}

