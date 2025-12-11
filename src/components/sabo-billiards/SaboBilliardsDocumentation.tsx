/**
 * SABO Billiards Documentation Hub
 * Centralized information about SABO Billiards business
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Users, 
  DollarSign,
  Facebook,
  Instagram,
  ExternalLink,
  Copy,
  Building
} from 'lucide-react';
import { SABO_BILLIARDS, saboUtils } from '@/lib/sabo-billiards';

export function SaboBilliardsDocumentation() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const businessServices = [
    'Pool Billiards - Bi-a 8 bi, 9 bi',
    'Snooker - Bi-a Snooker chuyên nghiệp',
    'Carom Billiards - Bi-a Carambole 3 băng',
    'Đồ ăn & Thức uống - Phục vụ 24/7',
    'Tổ chức sự kiện - Giải đấu, sinh nhật',
    'Đào tạo - Huấn luyện bi-a chuyên nghiệp'
  ];

  const operatingHours = [
    { day: 'Thứ 2 - Thứ 6', hours: '08:00 - 23:00' },
    { day: 'Thứ 7 - Chủ Nhật', hours: '07:00 - 24:00' },
    { day: 'Lễ Tết', hours: '24/7 (theo yêu cầu)' }
  ];

  const pricing = [
    { service: 'Pool 8-9 bi (giờ thường)', price: '30.000 VNĐ/giờ' },
    { service: 'Pool 8-9 bi (giờ cao điểm)', price: '40.000 VNĐ/giờ' },
    { service: 'Snooker (giờ thường)', price: '50.000 VNĐ/giờ' },
    { service: 'Snooker (giờ cao điểm)', price: '70.000 VNĐ/giờ' },
    { service: 'Carom 3 băng', price: '60.000 VNĐ/giờ' },
    { service: 'Khóa học cơ bản (10 buổi)', price: '1.500.000 VNĐ' },
    { service: 'Khóa học nâng cao (20 buổi)', price: '3.000.000 VNĐ' }
  ];

  const marketingInfo = [
    { platform: 'Facebook Page ID', value: SABO_BILLIARDS.FACEBOOK.PAGE_ID },
    { platform: 'Facebook Ad Account', value: SABO_BILLIARDS.FACEBOOK.AD_ACCOUNT_ID },
    { platform: 'Instagram Business ID', value: SABO_BILLIARDS.INSTAGRAM.ID },
    { platform: 'Google My Business', value: 'SABO Billiards - TP. Vũng Tàu' },
    { platform: 'Target Audience', value: 'Nam 18-45, yêu thích bi-a, Vũng Tàu & TPHCM' },
    { platform: 'Marketing Budget', value: '10-20 triệu VNĐ/tháng' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold gradient-text mb-2">{SABO_BILLIARDS.FULL_NAME}</h1>
        <p className="text-xl text-muted-foreground">Tài Liệu & Thông Tin Doanh Nghiệp</p>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Thông Tin Cơ Bản</TabsTrigger>
          <TabsTrigger value="services">Dịch Vụ & Giá Cả</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="operations">Vận Hành</TabsTrigger>
          <TabsTrigger value="technical">Kỹ Thuật</TabsTrigger>
        </TabsList>

        {/* Basic Information */}
        <TabsContent value="basic" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Thông Tin Doanh Nghiệp
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Tên:</span>
                    <div className="flex items-center gap-2">
                      <span>{SABO_BILLIARDS.NAME}</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(SABO_BILLIARDS.NAME)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Tên đầy đủ:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-right">{SABO_BILLIARDS.FULL_NAME}</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(SABO_BILLIARDS.FULL_NAME)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Loại hình:</span>
                    <Badge>{SABO_BILLIARDS.BUSINESS_TYPE}</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Company ID:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-1 rounded">{SABO_BILLIARDS.COMPANY_ID}</code>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(SABO_BILLIARDS.COMPANY_ID)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Địa Chỉ & Liên Hệ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="font-medium">Địa chỉ:</span>
                    <div className="flex items-start gap-2 text-right">
                      <span className="max-w-48">{SABO_BILLIARDS.ADDRESS}</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(SABO_BILLIARDS.ADDRESS)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Tọa độ:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-1 rounded">
                        {SABO_BILLIARDS.COORDINATES.LATITUDE}, {SABO_BILLIARDS.COORDINATES.LONGITUDE}
                      </code>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`${SABO_BILLIARDS.COORDINATES.LATITUDE}, ${SABO_BILLIARDS.COORDINATES.LONGITUDE}`)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Email:</span>
                    <div className="flex items-center gap-2">
                      <span>{SABO_BILLIARDS.CONTACT.EMAIL}</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(SABO_BILLIARDS.CONTACT.EMAIL)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Điện thoại:</span>
                    <div className="flex items-center gap-2">
                      <span>{SABO_BILLIARDS.CONTACT.PHONE}</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(SABO_BILLIARDS.CONTACT.PHONE)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button 
                      onClick={() => window.open(saboUtils.getGoogleMapsUrl(), '_blank')}
                      className="w-full"
                      variant="outline"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Xem trên Google Maps
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Services & Pricing */}
        <TabsContent value="services" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Dịch Vụ Chính</CardTitle>
                <CardDescription>Các dịch vụ được cung cấp tại SABO Billiards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {businessServices.map((service, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded hover:bg-muted">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span>{service}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Bảng Giá Dịch Vụ
                </CardTitle>
                <CardDescription>Giá cả cập nhật tháng 12/2025</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pricing.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded hover:bg-muted">
                      <span className="text-sm">{item.service}</span>
                      <Badge variant="secondary">{item.price}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Giờ Hoạt Động
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {operatingHours.map((schedule, index) => (
                  <div key={index} className="text-center p-4 rounded-lg bg-muted">
                    <div className="font-medium">{schedule.day}</div>
                    <div className="text-lg font-bold text-primary">{schedule.hours}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing */}
        <TabsContent value="marketing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông Tin Marketing & Social Media</CardTitle>
              <CardDescription>Tài khoản và thông tin quảng cáo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {marketingInfo.map((info, index) => (
                  <div key={index} className="flex justify-between items-center p-3 rounded border">
                    <span className="font-medium">{info.platform}:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm max-w-64 truncate">
                        {info.value}
                      </code>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(info.value)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Quick Links</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Facebook className="h-4 w-4 mr-2" />
                      Facebook Page
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Instagram className="h-4 w-4 mr-2" />
                      Instagram Business
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Target Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {['billiards vũng tàu', 'bi-a vũng tàu', 'sabo billiards', 'pool billiards', 'snooker vũng tàu'].map((keyword) => (
                      <Badge key={keyword} variant="outline" className="cursor-pointer" onClick={() => copyToClipboard(keyword)}>
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quy Trình Vận Hành</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Quy trình check-in nhân viên:</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• Bán kính check-in: {SABO_BILLIARDS.CHECK_IN_RADIUS}m</li>
                    <li>• Sử dụng GPS để xác định vị trí</li>
                    <li>• Check-in/out tự động ghi nhận thời gian</li>
                    <li>• Báo cáo daily/weekly/monthly</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Quản lý đơn hàng:</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• Đặt bàn trực tiếp hoặc qua điện thoại</li>
                    <li>• Theo dõi thời gian sử dụng bàn</li>
                    <li>• Tính toán tự động theo giá giờ</li>
                    <li>• Xuất hóa đơn và báo cáo doanh thu</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cơ Sở Vật Chất</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-2xl font-bold text-primary">8</div>
                    <div>Bàn Pool</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-2xl font-bold text-primary">4</div>
                    <div>Bàn Snooker</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-2xl font-bold text-primary">2</div>
                    <div>Bàn Carom</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-2xl font-bold text-primary">24/7</div>
                    <div>Phục vụ</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Tiện ích khác:</h4>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• Khu vực nghỉ ngơi, bar</li>
                    <li>• WiFi miễn phí</li>
                    <li>• Điều hòa không khí</li>
                    <li>• Bãi đậu xe miễn phí</li>
                    <li>• Camera an ninh 24/7</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Technical */}
        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông Tin Kỹ Thuật</CardTitle>
              <CardDescription>Dành cho developers và system admin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
                <div className="space-y-2">
                  <h4 className="font-semibold font-sans">Database Tables:</h4>
                  <ul className="space-y-1">
                    <li>• companies</li>
                    <li>• employees</li>
                    <li>• users</li>
                    <li>• tasks</li>
                    <li>• task_templates</li>
                    <li>• orders</li>
                    <li>• checkins</li>
                    <li>• documents</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold font-sans">API Endpoints:</h4>
                  <ul className="space-y-1">
                    <li>• saboApi.company.*</li>
                    <li>• saboApi.employee.*</li>
                    <li>• saboApi.task.*</li>
                    <li>• saboApi.checkin.*</li>
                    <li>• saboApi.order.*</li>
                  </ul>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold">Import Statement:</h4>
                <div className="bg-muted p-3 rounded font-mono text-sm">
                  <code>
                    import {'{'} SABO_BILLIARDS, saboApi, useSaboCompany {'}'} from '@/lib/sabo-billiards';
                  </code>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="ml-2" 
                    onClick={() => copyToClipboard("import { SABO_BILLIARDS, saboApi, useSaboCompany } from '@/lib/sabo-billiards';")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Example Usage:</h4>
                <div className="bg-muted p-3 rounded font-mono text-sm">
                  <code>
                    const {'{'}employees, loading{'}'} = useSaboEmployees();<br/>
                    const companyId = SABO_BILLIARDS.COMPANY_ID;
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}