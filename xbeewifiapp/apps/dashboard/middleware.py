#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Copyright (c) 2015 Digi International Inc., All Rights Reserved.
#

'''
Created on Sep 9, 2013
Modified on Oct 23, 2013 by mwadsten

@author: skravik
'''


class DisableCSRF(object):
    def process_request(self, request):
        setattr(request, '_dont_enforce_csrf_checks', True)


class NoCacheApiMiddleware(object):
    '''
    Based on StackOverflow answer http://stackoverflow.com/a/2100633
    and related answer http://stackoverflow.com/a/2068407

    Ensures that API requests are not cached by browsers.
    '''
    def process_response(self, request, response):
        if request.path.startswith("/api/"):
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'

        return response
