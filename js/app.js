/* ============ 基础：等轴测投影 ============ */
const C30=Math.cos(Math.PI/6),S30=0.5,NS='http://www.w3.org/2000/svg';
const P=(x,y,z)=>[(x-y)*C30,(x+y)*S30-z];
const pts=a=>a.map(p=>{const q=P(p[0],p[1],p[2]);return q[0].toFixed(1)+','+q[1].toFixed(1)}).join(' ');
function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);if(attrs)for(const k in attrs){if(attrs[k]!=null)e.setAttribute(k,attrs[k])}if(parent)parent.appendChild(e);return e}
function grp(par,o={}){const g=el('g',{class:o.cls||''},par);if(o.id)g.dataset.id=o.id;if(o.kb){g.dataset.kb=o.kb;g.classList.add('pick')}if(o.go)g.dataset.go=o.go;if(o.tip)g.dataset.tip=o.tip;if(o.ctx)g.dataset.ctx=o.ctx;return g}
function box(par,{x,y,z,w,d,h,mat='metal',cls=''}){
  const g=el('g',{class:`bx m-${mat} ${cls}`},par);
  el('polygon',{class:'t',points:pts([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]])},g);
  el('polygon',{class:'f',points:pts([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]])},g);
  el('polygon',{class:'s',points:pts([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]])},g);
  return g}
const fRect=(par,Y,x1,z1,x2,z2,cls)=>el('polygon',{class:cls,points:pts([[x1,Y,z1],[x2,Y,z1],[x2,Y,z2],[x1,Y,z2]])},par);
const tRect=(par,Z,x1,y1,x2,y2,cls)=>el('polygon',{class:cls,points:pts([[x1,y1,Z],[x2,y1,Z],[x2,y2,Z],[x1,y2,Z]])},par);
function fText(par,Y,x,z,s,cls,size=12,anchor='start'){const q=P(x,Y,z);const t=el('text',{class:cls,transform:`matrix(${C30},${S30},0,1,${q[0]},${q[1]})`,'font-size':size,'text-anchor':anchor},par);t.textContent=s;return t}
function tText(par,Z,x,y,s,cls,size=12,anchor='start'){const q=P(x,y,Z);const t=el('text',{class:cls,transform:`matrix(${C30},${S30},${-C30},${S30},${q[0]},${q[1]})`,'font-size':size,'text-anchor':anchor},par);t.textContent=s;return t}
function fDot(par,Y,x,z,r,cls){const q=P(x,Y,z);return el('ellipse',{class:cls,cx:q[0],cy:q[1],rx:r*C30+.4,ry:r},par)}
const line3=(par,arr,cls)=>el('polyline',{class:cls,points:pts(arr)},par);

/* ============ 设备模型 ============ */
const SLOTS=[
  {n:1,type:'LPU'},{n:2,type:'LPU'},{n:3,type:'LPU'},{n:4,type:'LPU'},
  {n:5,type:'MPU',role:'主用'},{n:6,type:'MPU',role:'备用'},
  {n:7,type:'SFU'},{n:8,type:'SFU'},{n:9,type:'LPU'},{n:10,type:null}];
const LPUS=SLOTS.filter(s=>s.type==='LPU').map(s=>s.n);
const PICS=[{p:0,kind:'ge',name:'8×GE 光口子卡',count:8,prefix:'GigabitEthernet',kb:'pic-ge'},{p:1,kind:'100ge',name:'2×100GE 光口子卡',count:2,prefix:'100GE',kb:'pic-100ge'}];
const IF={};let sysname='R1';
function addIf(name,o){IF[name]=Object.assign({name,admin:true,ip:null,len:null,desc:'',kind:'phy',cable:false,parent:null,vid:null},o)}
LPUS.forEach(n=>PICS.forEach(pc=>{for(let k=0;k<pc.count;k++)addIf(`${pc.prefix}${n}/${pc.p}/${k}`,{slot:n,pic:pc.p,port:k,speed:pc.kind==='ge'?'1Gbps':'100Gbps',optic:pc.kind==='ge'?'SFP':'QSFP28'})}));
['GigabitEthernet1/0/0','GigabitEthernet1/0/1','100GE1/1/0','GigabitEthernet2/0/0','100GE3/1/0','100GE9/1/0','GigabitEthernet4/0/3'].forEach(n=>IF[n].cable=true);
Object.assign(IF['GigabitEthernet1/0/0'],{ip:'10.1.1.1',len:30,desc:'To_CE1'});
Object.assign(IF['100GE1/1/0'],{ip:'10.0.12.1',len:30,desc:'To_P2'});
Object.assign(IF['100GE3/1/0'],{ip:'10.0.13.1',len:30,desc:'To_P3'});
IF['GigabitEthernet1/0/1'].admin=false;
addIf('GigabitEthernet1/0/0.100',{kind:'sub',parent:'GigabitEthernet1/0/0',vid:100,ip:'192.168.100.1',len:24,desc:'Customer_A'});
addIf('LoopBack0',{kind:'loop',ip:'1.1.1.1',len:32});
addIf('NULL0',{kind:'null'});
const phyUp=i=>i.kind==='phy'?(i.admin&&i.cable):i.kind==='sub'?(i.admin&&phyUp(IF[i.parent])):i.admin;
const protoUp=i=>phyUp(i)&&(i.kind==='null'||!!i.ip)&&(i.kind!=='sub'||!!i.vid);
const portIf=(n,p,k)=>`${PICS[p].prefix}${n}/${p}/${k}`;
function macOf(name){let h=0;for(const c of name)h=(h*31+c.charCodeAt(0))>>>0;const b=[0x00,0xe0,0xfc,(h>>16)&255,(h>>8)&255,h&255].map(v=>v.toString(16).padStart(2,'0'));return `${b[0]}${b[1]}-${b[2]}${b[3]}-${b[4]}${b[5]}`}

/* ============ 知识库 ============ */
const KB={
chassis:{tag:'整机',title:'框式路由器',en:'Chassis-based Router',
  sum:'骨干网和城域核心常用的大容量设备。整机由机框、背板、各类单板、电源和风扇组成。单板插在槽位里，通过机框里的背板互相连通。',
  pts:['控制平面和转发平面分离：主控板 MPU 负责"想"，运行路由协议、算出路由；接口板 LPU 负责"做"，按转发表把报文送出去。','分布式转发：每块接口板都有自己的转发芯片和转发表，普通报文不经过主控板。','关键部件都有冗余：主控 1:1 主备，交换网板 N+1，电源 N+N，风扇多组。','和它相对的是盒式设备：端口固定、没有可插拔单板，结构简单但扩展性差。'],
  cfg:['display device','display version'],note:'display device 是认识一台新设备的第一条命令，能看到每个槽位插了什么板、是否在位、是否正常。'},
slot:{tag:'结构',title:'槽位',en:'Slot',sum:'机框上插单板的位置。槽位号就是接口名称里的第一个数字，例如 GigabitEthernet1/0/0 在 1 号槽。',
  pts:['槽位有用途约束：主控槽只能插主控板，接口板槽只能插接口板。','没有插板的槽位要装假面板，保证风道正常、防止灰尘进入。','本演示为了好看把所有板都画在前面，很多真实设备的交换网板在机框背面。']},
LPU:{tag:'单板',title:'接口板 LPU',en:'Line Processing Unit',
  sum:'也叫线卡。它承载子卡和物理端口，负责报文的接收、查表、转发。路由器的转发性能主要由接口板决定。',
  pts:['核心是网络处理器 NP：解析报文头、查 FIB、修改报文、决定从哪里出去。','流量管理芯片 TM 负责排队和调度，QoS 的各种动作最终在这里执行。','主控板算好的转发表会下发到每块接口板，接口板自己查表，这就是"分布式转发"。','子卡插在接口板上，决定端口的类型和速率。'],
  cfg:['display device','display interface brief'],drill:'点击单板查看内部'},
MPU:{tag:'单板',title:'主控板 MPU',en:'Main Processing Unit',
  sum:'设备的大脑，属于控制平面。运行 OSPF、IS-IS、BGP 等协议，生成路由表，并把转发表下发给接口板；同时负责设备管理、配置保存、日志告警。',
  pts:['一般两块，1:1 主备。主用板工作，备用板实时同步状态。','主用板故障时自动倒换到备用板。配合 NSR（不间断路由）等技术，邻居感知不到，业务不中断。','面板上有 Console 口和管理网口，开局时就是通过它们登录设备。','主控板不参与普通报文转发，只处理"发给自己"的协议报文和管理报文。'],
  cfg:['display device'],drill:'点击单板查看内部'},
SFU:{tag:'单板',title:'交换网板 SFU',en:'Switch Fabric Unit',
  sum:'负责接口板之间的报文交换。报文从一块接口板进来、要从另一块接口板出去时，就要经过交换网板。',
  pts:['入口接口板把报文切成固定长度的"信元"，交换网板按信元做无阻塞交换，出口接口板再重组成报文。','多块交换网板负荷分担，常见 N+1 冗余，坏一块不影响业务，只是总交换容量下降。','整机交换容量 = 交换网板能提供的总带宽，是设备选型的重要指标。'],drill:'点击单板查看内部'},
filler:{tag:'结构',title:'假面板',en:'Filler Panel',sum:'空槽位上的挡板。它不是可有可无的装饰：没有它，风会从空槽位"短路"流走，其他单板散热就会变差。',pts:['10 号槽当前为空，display device 中会显示 Absent。']},
power:{tag:'部件',title:'电源模块',en:'Power Supply Unit',sum:'为整机供电，支持交流或直流（机房常用 -48V 直流）。',pts:['常见 N+N 冗余：两路独立供电，各接一半电源模块，一路断电设备照常运行。','电源模块支持热插拔，可以在线更换。']},
fan:{tag:'部件',title:'风扇框',en:'Fan Tray',sum:'负责整机散热。风道一般是前进后出或左进右出，机房摆放时要保证风道方向一致。',pts:['风扇转速随温度自动调节。','风扇故障会产生告警，长时间高温可能导致单板复位。']},
backplane:{tag:'结构',title:'背板',en:'Backplane',sum:'机框内部的一块大电路板，所有单板插上去后通过它互联。背板上走两类通道：业务数据通道（接口板 ↔ 交换网板）和管理控制通道（主控板 ↔ 各单板）。',pts:['打开右上角的透视按钮可以看到它。','背板一般是无源的，几乎不会坏，所以整机可靠性很高。']},
np:{tag:'芯片',title:'网络处理器 NP',en:'Network Processor',sum:'接口板上最核心的转发芯片，属于转发平面。每个报文都要经过它。',
  pts:['解析：读出报文的二层头、IP 头、MPLS 标签、SRv6 SID 等。','查表：用目的地址查 FIB，得到出接口和下一跳；还会查 ACL、QoS 策略。','修改：TTL 减 1，重写二层头，压入或弹出标签。','NP 是可编程的，新特性往往靠升级微码支持；ASIC 速度更快但不灵活。']},
tm:{tag:'芯片',title:'流量管理芯片 TM',en:'Traffic Manager',sum:'负责报文的排队、调度和整形。端口带宽不够用时，它决定谁先走、谁等待、谁被丢弃。',pts:['每个端口有多个优先级队列（常见 8 个），对应不同业务等级。','调度方式有 SP（严格优先）、WFQ（加权公平）等。','后面的 QoS 课程讲的拥塞管理、拥塞避免、流量整形，都是在这里执行的。']},
lcpu:{tag:'芯片',title:'接口板 CPU',en:'Line Card CPU',sum:'接口板自己的管理处理器。它接收主控板下发的路由表项、ACL 等，并写进 NP 和表项存储；同时上报本板状态。',pts:['它不参与逐包转发，转发由 NP 完成。']},
tcam:{tag:'芯片',title:'表项存储 TCAM',en:'Ternary CAM / SRAM',sum:'存放 FIB、ACL、MAC 表等转发表项。TCAM 能在一个时钟周期内完成最长前缀匹配。',pts:['它的容量决定了设备能支持多少条路由，叫做"FIB 规格"。','全网路由（Internet 路由表）已超过 100 万条，对表项容量要求很高。']},
conn:{tag:'结构',title:'背板连接器',en:'Backplane Connector',sum:'单板和背板对接的高速连接器。单板插到位后，业务数据和管理信号都从这里进出。',pts:['单板热插拔时，连接器的长短针设计保证先接地、再通电，避免冲击。']},
mem:{tag:'芯片',title:'内存',en:'DDR Memory',sum:'主控 CPU 的内存，存放路由协议的数据库（如 OSPF 的 LSDB、BGP 的路由表）。路由规模越大，占用越多。',pts:[]},
flash:{tag:'芯片',title:'存储器',en:'Flash / SSD',sum:'保存系统软件和配置文件。执行 save 后，配置写入这里，重启后不丢失。',pts:['当前运行的配置叫 current-configuration，保存下来的叫 saved-configuration。'],cfg:['display current-configuration'],note:'演示版没有实现 save 命令。'},
clock:{tag:'芯片',title:'时钟模块',en:'Clock Module',sum:'为整机提供时钟和时间同步，支持 1588v2、同步以太网等。5G 承载网对时间同步要求很高。',pts:[]},
mgmt:{tag:'接口',title:'管理接口',en:'Console / MGMT ETH / USB',sum:'Console 口用串口线直连，开局或网络不通时救命用；管理网口用于带外管理（网管系统通过它管理设备）；USB 口可以用来开局或升级。',pts:['带外管理：管理流量和业务流量分开，业务网络故障时仍能登录设备。','你们开发的网管系统，通常就是通过管理口或带内的 Loopback 地址连到设备上的。']},
swchip:{tag:'芯片',title:'交换芯片',en:'Switch Fabric Chip',sum:'交换网板上的核心芯片，把来自各接口板的信元交换到目标接口板。',pts:['常见的是 Crossbar 或多级 CLOS 架构。']},
dcdc:{tag:'部件',title:'板载电源',en:'DC/DC Converter',sum:'把背板送来的电压转换成芯片需要的各种低电压。',pts:[]},
'pic-ge':{tag:'子卡',title:'8×GE 光口子卡',en:'Physical Interface Card',sum:'插在接口板上的子卡，提供 8 个千兆以太网 SFP 光口。子卡号是接口名称的第二个数字：GigabitEthernet1/0/3 就在 1 号槽 0 号子卡的第 3 个口。',
  pts:['同一块接口板可以插不同的子卡，灵活组合端口类型。','子卡上的 PHY/MAC 芯片负责物理层和二层的收发。','子卡一般支持热插拔。'],cfg:['display interface brief'],drill:'点击子卡查看端口'},
'pic-100ge':{tag:'子卡',title:'2×100GE 光口子卡',en:'Physical Interface Card',sum:'提供 2 个 100G 以太网 QSFP28 光口，一般用于设备之间的骨干互联。',pts:['100GE 端口可以用拆分线缆拆成 4×25GE 使用（依设备支持情况）。','接口名称以 100GE 开头，如 100GE1/1/0。'],cfg:['display interface brief'],drill:'点击子卡查看端口'},
phy:{tag:'芯片',title:'PHY / MAC 芯片',en:'PHY & MAC',sum:'PHY 负责物理层：把电信号和比特流互相转换、做编码。MAC 负责二层：把比特流组装成以太网帧，检查 FCS 校验和。',pts:['端口的 PHY 状态（up/down）就是这里检测到的链路信号。','CRC 错包计数也在这里统计，是排查链路质量的重要依据。']},
port:{tag:'接口',title:'物理端口',en:'Port',sum:'子卡面板上的插槽，插入光模块后接上光纤就成为一条物理链路的一端。',pts:['端口是硬件，接口是软件里对它的抽象。配置都是针对接口做的。','指示灯亮表示物理层 up。'],drill:'点击端口查看接口'},
optic:{tag:'部件',title:'光模块',en:'Optical Transceiver',sum:'把电信号转成光信号发出去，再把收到的光转回电信号。',
  pts:['封装：SFP（1G）、SFP+（10G）、SFP28（25G）、QSFP28（100G）、QSFP-DD（400G）。','类型：多模（短距离，几百米）和单模（长距离，10km 到 80km）。','两端光模块的速率和波长要匹配。','收发光功率是判断链路好坏的关键指标。'],cfg:['display transceiver interface GigabitEthernet1/0/0']},
fiber:{tag:'链路',title:'光纤',en:'Fiber',sum:'承载光信号的物理介质。黄色外皮通常是单模光纤，橙色或水绿色通常是多模光纤。',pts:['常见接头：LC（小方头，最常用）、SC（大方头）、MPO（多芯，用于 100G/400G 并行光）。','一条链路两端的设备端口通过光纤相连，就是网管里看到的"物理链路"。']},
ifname:{tag:'概念',title:'接口命名规则',en:'Interface Naming',sum:'接口名 = 接口类型 + 槽位号/子卡号/端口号。读懂它，就能从一个名字直接定位到机框上的物理位置。',
  pts:['GigabitEthernet：千兆以太网；100GE：100G 以太网；Eth-Trunk：链路聚合；LoopBack：环回。','槽位号：板插在机框的哪个槽。','子卡号：板上的哪块子卡，从 0 开始。','端口号：子卡上的第几个口，从 0 开始。','子接口在后面加点和编号：GigabitEthernet1/0/0.100。']},
physif:{tag:'接口',title:'物理接口与状态',en:'Physical Interface',sum:'接口有两个状态。PHY（物理状态）：光信号正常就 up。Protocol（协议状态）：链路层协商成功、配置了 IP 等条件满足后才 up。',
  pts:['PHY down：多半是没插光纤、光模块坏、对端没开、光功率不够。','*down：管理员执行了 shutdown，接口被手动关掉。','PHY up 但 Protocol down：物理通了，但上层没起来，例如没配 IP 或两端封装不一致。','本演示中 Protocol up 的简化条件是：PHY up 且配置了 IP 地址。'],
  cfg:['display interface brief','system-view','interface GigabitEthernet1/0/1','undo shutdown','display this'],note:'GigabitEthernet1/0/1 插了光纤但被 shutdown，执行 undo shutdown 后它会 up，左侧端口灯会亮。'},
mac:{tag:'概念',title:'数据链路层',en:'Ethernet / MAC',sum:'以太网接口有自己的 MAC 地址，同一链路上的设备用 MAC 地址互相找到对方。MTU 决定一个帧最多能装多少字节（默认 1500）。',pts:['三层转发时，路由器每转发一跳都会重写二层头：源 MAC 换成自己出接口的 MAC，目的 MAC 换成下一跳的 MAC。','两端 MTU 不一致会导致大包丢失，OSPF 邻居也可能起不来。']},
l2l3:{tag:'概念',title:'三层接口',en:'Layer-3 Interface',sum:'配置了 IP 地址的接口就是三层接口，路由器靠它们参与 IP 转发和路由协议。',pts:['接口 IP 和掩码决定了"直连路由"：配好 10.1.1.1/30，路由表里就自动出现 10.1.1.0/30。','/30 掩码只有 2 个可用地址，正好给点到点链路两端使用。','有的接口可以在二层（交换）和三层（路由）之间切换，路由器上默认一般是三层。'],
  cfg:['system-view','interface GigabitEthernet1/0/2','ip address 10.1.2.1 255.255.255.252','display this','quit','display ip interface brief'],note:'GigabitEthernet1/0/2 没插光纤，所以即使配了 IP，Protocol 仍然是 down。'},
subif:{tag:'接口',title:'子接口',en:'Sub-interface',sum:'把一个物理接口按 VLAN 拆成多个逻辑接口，每个子接口有自己的 IP、可以属于不同的 VPN。这是 PE 设备接入多个客户的常见做法。',
  pts:['子接口编号写在点后面，通常和 VLAN 号保持一致，方便维护。','dot1q termination vid 100：表示这个子接口只接收、只发送 VLAN 100 的帧。','物理接口 down 了，它下面的所有子接口都会 down。','后续 L3VPN 课程会把子接口绑定到 VPN 实例。'],
  cfg:['system-view','interface GigabitEthernet1/0/0.200','dot1q termination vid 200','ip address 192.168.200.1 24','display this'],note:'执行后左侧接口视图会多出一个子接口。'},
loopback:{tag:'接口',title:'LoopBack 接口',en:'Loopback Interface',sum:'纯软件的逻辑接口，只要设备在运行它就一直 up，不受任何物理链路影响。',
  pts:['常用作 Router ID、BGP 邻居地址、网管系统登录地址，因为它最稳定。','掩码一般用 /32。'],cfg:['system-view','interface LoopBack1','ip address 2.2.2.2 32','quit','display ip interface brief']},
trunk:{tag:'接口',title:'Eth-Trunk 链路聚合',en:'Link Aggregation',sum:'把多条物理链路捆绑成一条逻辑链路，带宽叠加，一条断了其他的继续工作。',pts:['成员口的速率、双工要一致。','LACP 模式会和对端协商，比手工模式更安全。','流量按 hash 分担到成员口上，单条流只会走一个成员口。'],cfg:['interface Eth-Trunk1','trunkport GigabitEthernet 2/0/0 to 2/0/1','mode lacp-static'],run:false,note:'演示版命令行暂不支持 Eth-Trunk，这里只做配置展示。'},
tunnel:{tag:'接口',title:'Tunnel 接口',en:'Tunnel Interface',sum:'隧道的逻辑接口，比如 MPLS TE 隧道、GRE 隧道。报文进入 Tunnel 接口后会被封装上新的头部，沿着隧道路径走。',pts:['后续的静态/动态隧道、SRv6 Policy 课程会详细展开。'],run:false},
null0:{tag:'接口',title:'NULL0 接口',en:'Null Interface',sum:'"黑洞"接口，发往它的报文全部丢弃。常用于路由汇总时防环，或者过滤某些目的地址的流量。',pts:['NULL0 永远 up，不能配置 IP。']},
vpnpre:{tag:'预告',title:'绑定 VPN 实例',en:'ip binding vpn-instance',sum:'接口（或子接口）绑定到 VPN 实例后，它的路由就进入这个 VPN 自己的路由表，和其他客户隔离。这是 L3VPN 的起点。',pts:['在 L3VPN 课程中会用动画演示两个客户使用同一网段也互不干扰。'],run:false,cfg:['ip vpn-instance vpna',' ipv4-family','  route-distinguisher 100:1','interface GigabitEthernet1/0/0.100',' ip binding vpn-instance vpna']},
};

function ifKB(name){const i=IF[name];if(!i)return KB.physif;
  const up=phyUp(i),pu=protoUp(i);
  const rows=[['PHY',`<span class="pill ${up?'up':'down'}">${i.kind==='phy'&&!i.admin?'*down':up?'up':'down'}</span>`],['Protocol',`<span class="pill ${pu?'up':'down'}">${pu?'up':'down'}</span>`],['IP 地址',i.ip?`${i.ip}/${i.len}`:'未配置'],['描述',i.desc||'—']];
  if(i.kind==='phy')rows.push(['位置',`${i.slot} 号槽 · ${i.pic} 号子卡 · ${i.port} 号端口`],['速率',i.speed],['光模块',i.cable?`${i.optic} 已插入，光纤已连接`:`未连接光纤`],['MAC',macOf(name)]);
  if(i.kind==='sub')rows.push(['父接口',i.parent],['VLAN',i.vid??'未配置']);
  const subs=Object.values(IF).filter(s=>s.parent===name).map(s=>s.name);
  if(subs.length)rows.push(['子接口',subs.join('<br>')]);
  const cfg=['system-view',`interface ${name}`];if(i.desc)cfg.push(`description ${i.desc}`);if(i.ip)cfg.push(`ip address ${i.ip} ${len2mask(i.len)}`);cfg.push(i.admin?'undo shutdown':'shutdown','display this');
  let why='';if(i.kind==='phy'){if(!i.admin)why='这个接口被 shutdown 了，执行 undo shutdown 即可打开。';else if(!i.cable)why='这个端口没有接光纤，所以 PHY 是 down。';else if(!i.ip)why='物理层已经 up，但没有配置 IP 地址，所以 Protocol 是 down。'}
  return {tag:'接口',title:name,en:i.kind==='phy'?`${i.speed} Ethernet`:i.kind==='sub'?'Sub-interface':'Logical interface',sum:why||'接口状态正常，物理层和协议层都已 up。',rows,pts:[],cfg,note:'可以在命令行里修改它，例如 shutdown / undo shutdown、修改 IP，左侧视图会同步变化。',
    links:[['ifname','接口命名规则'],['physif','PHY 和 Protocol 状态'],['subif','子接口']]}}

/* ============ 视图与状态 ============ */
const svg=document.getElementById('svg'),vp=document.getElementById('vp'),scene=document.getElementById('scene'),fx=document.getElementById('fx');
let view={k:'chassis'},sel=null,xray=false;

function render(v,{fit=true,animate=true}={}){
  stopFlow();
  const doit=()=>{view=v;scene.innerHTML='';fx.innerHTML='';scene.classList.toggle('xray',xray&&v.k==='chassis');
    ({chassis:drawChassis,board:drawBoard,sub:drawSub,port:drawPort})[v.k](v);
    drawCallouts(v);if(fit)fitView();crumbs();flowButtons();
    document.getElementById('hint').textContent={chassis:'滚轮或双指缩放 · 拖动平移 · 点击单板、子卡或端口深入查看',board:'单板平放展示，方便观察内部 · 点击芯片看讲解，点击子卡继续深入',sub:'点击端口查看接口 · 黄色的是光纤，白色的是光模块',port:'点击各个方块查看讲解 · 在命令行实验里修改接口，这里会同步变化'}[v.k];
    document.getElementById('xray').hidden=v.k!=='chassis';
    if(sel){const e=scene.querySelector(`[data-id="${CSS.escape(sel)}"]`);if(e)e.classList.add('sel')}
    requestAnimationFrame(()=>scene.classList.remove('fade'))};
  if(animate&&scene.childNodes.length){scene.classList.add('fade');setTimeout(doit,200)}else doit();
}
function viewKB(v){if(v.k==='chassis')return['chassis'];if(v.k==='board')return[slotOf(v.n).type];if(v.k==='sub')return[PICS[v.p].kb];return['iface',v.name]}
const slotOf=n=>SLOTS.find(s=>s.n===n);

function crumbs(){const c=document.getElementById('crumbs');c.innerHTML='';const items=[['机框 R1',{k:'chassis'}]];
  if(view.k!=='chassis'){const n=view.n??IF[view.name]?.slot;if(n){items.push([`${n} 号槽 · ${slotOf(n).type}`,{k:'board',n}])}}
  if(view.k==='sub'||(view.k==='port'&&IF[view.name]?.kind==='phy')){const i=IF[view.name];const n=view.n??i.slot,p=view.p??i.pic;items.push([`${p} 号子卡`,{k:'sub',n,p}])}
  if(view.k==='port')items.push([view.name,view]);
  items.forEach(([t,v],idx)=>{if(idx){const s=document.createElement('i');s.textContent='›';c.appendChild(s)}const b=document.createElement('button');b.textContent=t;if(idx<items.length-1)b.onclick=()=>{sel=null;go(v)};c.appendChild(b)})}

function go(v){render(v);const [k,a]=viewKB(v);showInfo(k,a);}

/* ---------- 机框 ---------- */
const W=560,D=380,H=600,SX=n=>20+(n-1)*52;
const GE_Z=k=>254-k*20, HG_Z=k=>392-k*48;
function drawChassis(){
  tRect(scene,0,-30,-20,W+40,D+70,'shadow');
  const ch=grp(scene,{kb:'chassis',id:'chassis',tip:'机框'});
  box(ch,{x:0,y:0,z:0,w:W,d:D,h:H,mat:'metal'});
  tText(ch,H,24,40,`${sysname} · 框式路由器（演示机型）`,'ink-l',15);
  tText(ch,H,24,64,'10 个单板槽位 · 4 电源 · 1 风扇框','ink-l',11);
  const xr=el('g',{class:'xr'},scene);
  const bp=grp(xr,{kb:'backplane',id:'backplane',tip:'背板'});
  el('polygon',{class:'backplane',points:pts([[14,34,92],[546,34,92],[546,34,500],[14,34,500]])},bp);
  fText(bp,34,280,520,'背板 Backplane','ink-l',13,'middle');
  fRect(ch,D+.5,14,86,546,506,'recess');
  SLOTS.forEach(s=>drawSlot(s));
  for(let i=0;i<4;i++){const x=20+i*131;const g=grp(scene,{kb:'power',id:'pwr'+i,tip:`电源模块 PWR${i+1}`});box(g,{x,y:D-2,z:12,w:124,d:8,h:66,mat:'psu'});
    for(let j=0;j<6;j++)fRect(g,D+6.2,x+48+j*11,24,x+53+j*11,66,'grille');fDot(g,D+6.2,x+14,64,3.2,'led on');fText(g,D+6.2,x+10,32,`PWR${i+1}`,'ink-d',10);fRect(g,D+6.2,x+104,26,x+116,62,'handle')}
  const fan=grp(scene,{kb:'fan',id:'fan',tip:'风扇框'});box(fan,{x:20,y:D-2,z:512,w:520,d:8,h:76,mat:'psu'});
  for(let j=0;j<8;j++)fRect(fan,D+6.2,90,522+j*8,520,525+j*8,'grille');fText(fan,D+6.2,30,556,'FAN','ink-d',12);fDot(fan,D+6.2,40,530,3.2,'led on blink');
}
function drawSlot(s){
  const x0=SX(s.n),Y=D+6,px1=x0+2,px2=x0+50;
  const g=grp(scene,{cls:'slotg type-'+(s.type||'none'),kb:s.type||'filler',id:'slot:'+s.n,go:s.type?'board:'+s.n:null,tip:s.type?`${s.n} 号槽 · ${KB[s.type].title}${s.role?'（'+s.role+'）':''}`:`${s.n} 号槽 · 空（假面板）`});
  g.classList.add('slide');
  box(g,{x:px1,y:D,z:92,w:48,d:6,h:406,mat:s.type?'panel':'metal'});
  if(!s.type){[110,480].forEach(z=>fDot(g,Y,x0+26,z,3,'screw'));fText(g,Y,x0+26,300,'空','ink-l',11,'middle');return}
  fRect(g,Y,px1+8,484,px2-8,494,'handle');fRect(g,Y,px1+8,96,px2-8,106,'handle');
  fText(g,Y,x0+26,466,String(s.n),'ink-d',14,'middle');fText(g,Y,x0+26,452,s.type,'ink-d',9,'middle');
  fDot(g,Y,px1+12,436,2.6,'led on blink');fDot(g,Y,px1+24,436,2.6,s.type==='MPU'&&s.role==='主用'?'led on':'led');fDot(g,Y,px1+36,436,2.6,'led');
  if(s.type==='LPU'){
    const w1=grp(g,{kb:'pic-100ge',id:`pic:${s.n}:1`,go:`sub:${s.n}:1`,tip:`${s.n} 号槽 1 号子卡 · 2×100GE`});
    fRect(w1,Y,px1+4,300,px2-4,426,'win');
    for(let k=0;k<2;k++){const name=portIf(s.n,1,k),z=HG_Z(k);const pg=grp(w1,{kb:'port',id:'p:'+name,go:'port:'+name,tip:name});fRect(pg,Y,px1+9,z-14,px2-9,z+14,'hole');fDot(pg,Y,px2-13,z+20,2.2,phyUp(IF[name])?'led on':'led')}
    const w0=grp(g,{kb:'pic-ge',id:`pic:${s.n}:0`,go:`sub:${s.n}:0`,tip:`${s.n} 号槽 0 号子卡 · 8×GE`});
    fRect(w0,Y,px1+4,104,px2-4,284,'win');
    for(let k=0;k<8;k++){const name=portIf(s.n,0,k),z=GE_Z(k);const pg=grp(w0,{kb:'port',id:'p:'+name,go:'port:'+name,tip:name});fRect(pg,Y,px1+9,z-7,px2-16,z+7,'hole');fDot(pg,Y,px2-10,z,2.2,phyUp(IF[name])?'led on':'led')}
  }else if(s.type==='MPU'){
    fText(g,Y,x0+26,410,s.role,'ink-cn',10,'middle');
    const m=grp(g,{kb:'mgmt',id:'mgmt:'+s.n,tip:'Console / 管理网口 / USB'});
    [[360,'CON'],[310,'ETH'],[262,'USB']].forEach(([z,t])=>{fRect(m,Y,px1+10,z-12,px2-10,z+10,'hole');fText(m,Y,x0+26,z-20,t,'ink-d',8,'middle')});
  }else{for(let j=0;j<14;j++)fRect(g,Y,px1+10,150+j*18,px2-10,156+j*18,'grille')}
}

/* ---------- 单板 ---------- */
function drawBoard({n}){
  const s=slotOf(n),T=s.type,BW=600,BD=400;
  tRect(scene,0,-20,-30,BW+30,BD+60,'shadow');
  const base=grp(scene,{kb:T,id:'board',tip:KB[T].title});
  box(base,{x:0,y:0,z:0,w:BW,d:BD,h:8,mat:'pcb'});
  const part=(kb,id,tip,b,extra)=>{const g=grp(scene,{kb,id:'c:'+id,tip});box(g,b);if(extra)extra(g);return g};
  const sink=(g,x,y,w,d,z,n2)=>{for(let i=0;i<n2;i++)box(g,{x:x+i*(w/n2),y,z,w:w/n2*.45,d,h:22,mat:'sink'})};
  // 连接器
  part('conn','conn','背板连接器',{x:50,y:0,z:8,w:500,d:20,h:40,mat:'conn'});
  if(T==='LPU'){
    line3(scene,[[155,250,8.5],[155,175,8.5],[180,175,8.5]],'trace');line3(scene,[[445,250,8.5],[445,200,8.5],[250,170,8.5]],'trace');
    line3(scene,[[270,120,8.5],[300,125,8.5]],'trace');line3(scene,[[345,90,8.5],[345,20,8.5]],'trace');line3(scene,[[440,90,8.5],[270,100,8.5]],'trace c');line3(scene,[[475,140,8.5],[475,120,8.5]],'trace c');
    part('dcdc','dcdc','板载电源',{x:30,y:50,z:8,w:60,d:60,h:16,mat:'chip'});
    part('lcpu','lcpu','接口板 CPU',{x:440,y:60,z:8,w:70,d:58,h:8,mat:'chip'});
    part('tcam','tcam','表项存储 TCAM',{x:420,y:140,z:8,w:110,d:40,h:6,mat:'chip'});
    part('np','np','网络处理器 NP',{x:150,y:70,z:8,w:120,d:100,h:10,mat:'chip'},g=>sink(g,152,74,118,92,18,7));
    part('tm','tm','流量管理芯片 TM',{x:300,y:90,z:8,w:90,d:70,h:10,mat:'chip'});
    PICS.forEach(pc=>{const x=pc.p?320:30;const g=part(pc.kb,'pic'+pc.p,`${pc.p} 号子卡 · ${pc.name}`,{x,y:250,z:8,w:250,d:150,h:26,mat:'sub'});g.dataset.go=`sub:${n}:${pc.p}`;
      tText(g,34.1,x+14,280,`子卡 ${pc.p}`,'ink-cn',14);tText(g,34.1,x+14,300,pc.name,'ink-cn',10)});
  }else if(T==='MPU'){
    line3(scene,[[220,200,8.5],[220,20,8.5]],'trace');line3(scene,[[300,140,8.5],[340,140,8.5]],'trace');
    part('dcdc','dcdc','板载电源',{x:30,y:50,z:8,w:60,d:60,h:16,mat:'chip'});
    part('cpu','mpu-cpu','主控 CPU',{x:150,y:80,z:8,w:140,d:120,h:10,mat:'chip'},g=>sink(g,152,84,136,112,18,8));
    scene.lastChild.dataset.kb='MPU';
    for(let i=0;i<4;i++)part('mem','mem'+i,'内存 DDR',{x:340+i*22,y:60,z:8,w:10,d:170,h:28,mat:'chip'});
    part('flash','flash','存储器 Flash/SSD',{x:460,y:80,z:8,w:90,d:50,h:8,mat:'chip'});
    part('clock','clock','时钟模块',{x:460,y:160,z:8,w:90,d:60,h:12,mat:'sub'});
    part('mgmt','mgmtblk','管理接口',{x:60,y:300,z:8,w:300,d:100,h:20,mat:'cage'});
  }else{
    part('dcdc','dcdc','板载电源',{x:30,y:50,z:8,w:60,d:60,h:16,mat:'chip'});
    [120,330].forEach((x,i)=>part('swchip','sw'+i,'交换芯片',{x,y:120,z:8,w:150,d:140,h:10,mat:'chip'},g=>sink(g,x+2,124,146,132,18,8)));
    line3(scene,[[195,120,8.5],[195,20,8.5]],'trace');line3(scene,[[405,120,8.5],[405,20,8.5]],'trace');
  }
  // 前面板
  const Y=BD+12,pn=grp(scene,{kb:T,id:'panel',tip:`${T} 前面板`});
  box(pn,{x:0,y:BD,z:0,w:BW,d:12,h:80,mat:'panel'});
  fRect(pn,Y,6,20,18,60,'handle');fRect(pn,Y,BW-18,20,BW-6,60,'handle');
  fDot(pn,Y,30,64,3,'led on blink');fDot(pn,Y,30,48,3,'led');fText(pn,Y,40,22,String(n),'ink-d',12);
  if(T==='LPU'){
    fRect(pn,Y,30,10,282,72,'win');fRect(pn,Y,318,10,572,72,'win');
    for(let k=0;k<8;k++){const name=portIf(n,0,k),x=44+k*29;const pg=grp(scene,{kb:'port',id:'p:'+name,go:'port:'+name,tip:name});fRect(pg,Y+.2,x,26,x+22,44,'hole');fDot(pg,Y+.2,x+11,56,2.4,phyUp(IF[name])?'led on':'led');fText(pg,Y+.2,x+11,16,String(k),'ink-d',8,'middle')}
    for(let k=0;k<2;k++){const name=portIf(n,1,k),x=336+k*118;const pg=grp(scene,{kb:'port',id:'p:'+name,go:'port:'+name,tip:name});fRect(pg,Y+.2,x,22,x+100,52,'hole');fDot(pg,Y+.2,x+50,62,2.6,phyUp(IF[name])?'led on':'led');fText(pg,Y+.2,x+50,14,String(k),'ink-d',8,'middle')}
  }else if(T==='MPU'){
    const m=grp(scene,{kb:'mgmt',id:'mgmt',tip:'Console / 管理网口 / USB'});
    [[90,'CONSOLE'],[170,'MGMT ETH'],[250,'USB']].forEach(([x,t])=>{fRect(m,Y+.2,x,28,x+50,58,'hole');fText(m,Y+.2,x+25,18,t,'ink-d',8,'middle')});
    fText(pn,Y+.2,330,40,s.role==='主用'?'ACTIVE ●':'STANDBY','ink-d',11);
  }else{for(let j=0;j<20;j++)fRect(pn,Y,120+j*22,20,128+j*22,60,'grille')}
}

/* ---------- 子卡 ---------- */
function drawSub({n,p}){
  const pc=PICS[p],SW=520,SD=300;
  tRect(scene,0,-20,-30,SW+30,SD+120,'shadow');
  const base=grp(scene,{kb:pc.kb,id:'pic',tip:pc.name});box(base,{x:0,y:0,z:0,w:SW,d:SD,h:6,mat:'sub'});
  const c=grp(scene,{kb:'conn',id:'c:pconn',tip:'子卡连接器（插到接口板上）'});box(c,{x:120,y:0,z:6,w:280,d:16,h:26,mat:'conn'});
  const ph=grp(scene,{kb:'phy',id:'c:phy',tip:'PHY / MAC 芯片'});box(ph,{x:200,y:70,z:6,w:120,d:80,h:10,mat:'chip'});
  line3(scene,[[260,70,6.5],[260,22,6.5]],'trace');
  const ports=[];for(let k=0;k<pc.count;k++){const w=p?160:46,gap=p?60:12,x=p?70+k*(w+gap):20+k*(w+gap);ports.push({k,x,w,name:portIf(n,p,k)})}
  ports.forEach(o=>{line3(scene,[[o.x+o.w/2,210,6.5],[260,150,6.5]],'trace')});
  ports.forEach(o=>{const g=grp(scene,{kb:'port',id:'p:'+o.name+':cage',go:'port:'+o.name,tip:o.name});box(g,{x:o.x,y:210,z:6,w:o.w,d:90,h:p?36:22,mat:'cage'})});
  const Y=SD+10,pn=grp(scene,{kb:pc.kb,id:'ppanel',tip:'子卡面板'});box(pn,{x:0,y:SD,z:0,w:SW,d:10,h:84,mat:'panel'});
  ports.forEach(o=>{const i=IF[o.name];const g=grp(scene,{kb:'port',id:'p:'+o.name,go:'port:'+o.name,tip:`${o.name} · ${phyUp(i)?'up':'down'}`});
    const zt=p?48:34,zb=p?10:12;fRect(g,Y+.2,o.x,zb,o.x+o.w,zt,'hole');fDot(g,Y+.2,o.x+o.w/2,zt+10,2.8,phyUp(i)?'led on':'led');fText(g,Y+.2,o.x+o.w/2,zt+26,String(o.k),'ink-d',10,'middle')});
  ports.filter(o=>IF[o.name].cable).forEach(o=>{
    const zb=(p?10:12)+3,zt=(p?48:34)-3,ox=o.x+6,ow=o.w-12;
    const g=grp(scene,{kb:'optic',id:'opt:'+o.name,tip:`${pc.kind==='ge'?'SFP':'QSFP28'} 光模块`});box(g,{x:ox,y:Y,z:zb,w:ow,d:46,h:zt-zb,mat:'optic'});
    fRect(g,Y+46.2,ox+ow*.3,zb+2,ox+ow*.7,zb+6,'tab-blue');
    const f=grp(scene,{kb:'fiber',id:'fib:'+o.name,tip:'光纤（LC 接头）'});const cx=ox+ow/2,cz=(zb+zt)/2;
    line3(f,[[cx-4,Y+46,cz],[cx-4,Y+90,cz-6],[cx-4,Y+140,-30],[cx-4,Y+200,-70]],'fiber');line3(f,[[cx+4,Y+46,cz],[cx+4,Y+90,cz-6],[cx+4,Y+140,-30],[cx+4,Y+200,-70]],'fiber');
  });
}

/* ---------- 接口（2D） ---------- */
function drawPort({name}){
  const i=IF[name],g=scene;const phys=i.kind==='phy'?i:IF[i.parent]||i;const pname=phys.name;
  const T=(x,y,s,cls,anchor)=>{const t=el('text',{x,y,class:cls,'text-anchor':anchor||'start'},g);t.textContent=s;return t};
  // 命名解码
  const m=pname.match(/^([A-Za-z-]+|100GE)(\d+)\/(\d+)\/(\d+)$/)||[pname,pname,'','',''];
  const segs=[[m[1],'接口类型'],[m[2],'槽位号'],['/',''],[m[3],'子卡号'],['/',''],[m[4],'端口号']];
  const nameG=grp(g,{kb:'ifname',id:'ifname',tip:'接口命名规则'});
  el('rect',{x:0,y:0,width:900,height:132,rx:12,class:'d-box'},nameG);
  T(20,28,'接口名称怎么读','d-s');
  let x=20,ci=0;segs.forEach(([s,cap])=>{const t=T(x,82,s,'d-big '+(cap?'seg'+(ci):''));if(!cap)t.setAttribute('fill','var(--muted)');const w=t.getComputedTextLength()||s.length*20;
    if(cap){el('path',{d:`M${x} 94 v8 h${w} v-8`,class:'d-line'},nameG);T(x+w/2,120,cap,'d-s','middle');ci++}x+=w+4});
  T(x+24,70,`→ ${phys.slot??'-'} 号槽，${phys.pic??'-'} 号子卡，第 ${phys.port??'-'} 个口`,'d-t');
  T(x+24,94,'点左侧面包屑可以回到对应的板卡','d-s');
  // 物理部分
  const ph=el('g',{transform:'translate(0,160)'},g);
  el('rect',{x:0,y:0,width:400,height:300,rx:12,class:'d-box'},ph);T(20,28,'物理层：端口 + 光模块 + 光纤','d-s').parentNode===ph||0;
  ph.appendChild(g.lastChild);
  const pnl=grp(ph,{kb:'port',id:'d-port',tip:'物理端口'});el('rect',{x:60,y:60,width:24,height:200,class:'d-panel'},pnl);el('rect',{x:84,y:120,width:110,height:70,class:'d-cage'},pnl);el('rect',{x:30,y:126,width:54,height:58,class:'hole'},pnl);
  el('text',{x:72,y:282,class:'d-s','text-anchor':'middle'},pnl).textContent='面板 / 端口';
  if(phys.cable){const op=grp(ph,{kb:'optic',id:'d-opt',tip:'光模块'});el('rect',{x:-10,y:130,width:170,height:50,rx:4,class:'d-opt'},op);el('rect',{x:-24,y:140,width:16,height:30,class:'tab-blue'},op);
    el('text',{x:140,y:215,class:'d-s','text-anchor':'middle'},op).textContent=`${phys.optic} 光模块`;
    const fb=grp(ph,{kb:'fiber',id:'d-fib',tip:'光纤'});el('path',{d:'M-24 150 C -80 150 -60 260 -140 270',class:'fiber'},fb);el('path',{d:'M-24 160 C -90 160 -70 270 -150 280',class:'fiber'},fb);
    el('text',{x:-130,y:250,class:'d-s','text-anchor':'middle'},fb).textContent='光纤';
  }else{el('text',{x:-40,y:160,class:'d-s','text-anchor':'middle'},ph).textContent='未接光纤'}
  const st=phyUp(phys);el('circle',{cx:240,cy:155,r:7,class:st?'st-up':'st-down'},ph);el('text',{x:256,y:160,class:'d-t'},ph).textContent=`PHY ${phys.kind==='phy'&&!phys.admin?'*down':st?'up':'down'}`;
  el('text',{x:226,y:190,class:'d-s'},ph).textContent=`${phys.speed||''} · ${phys.cable?'光信号正常':'无光'}`;
  // 逻辑层次
  const lg=el('g',{transform:'translate(440,160)'},g);
  const layer=(y,kb,id,title,sub,ok,cls='')=>{const b=grp(lg,{kb,id,tip:title});el('rect',{x:0,y,width:460,height:58,rx:10,class:'d-box '+cls},b);el('text',{x:16,y:y+24,class:'d-t'},b).textContent=title;el('text',{x:16,y:y+44,class:'d-m'},b).textContent=sub;
    if(ok!=null){el('circle',{cx:438,cy:y+29,r:7,class:ok?'st-up':'st-down'},b)}return b};
  layer(0,'physif','L-phy','物理接口 '+pname,`PHY ${st?'up':'down'} · ${phys.speed||''}`,st,'l1');
  layer(72,'mac','L-mac','数据链路层 · 以太网',`MAC ${macOf(pname)} · MTU 1500`,st);
  layer(144,'l2l3','L-ip','网络层 · IP',phys.ip?`${phys.ip}/${phys.len} · Protocol ${protoUp(phys)?'up':'down'}`:'未配置 IP · Protocol down',protoUp(phys));
  [36,108].forEach(y=>el('path',{d:`M230 ${y+22} v14`,class:'d-arrow'},lg));
  const subs=Object.values(IF).filter(s=>s.parent===pname);
  let sy=230;el('text',{x:0,y:sy,class:'d-s'},lg).textContent=subs.length?'子接口（按 VLAN 拆分出的逻辑接口）':'还没有子接口，可在命令行里创建';
  subs.forEach((s,idx)=>{const b=grp(lg,{kb:'subif',id:'sub:'+s.name,go:'port:'+s.name,tip:s.name});const y=sy+12+idx*50;el('rect',{x:0,y,width:340,height:40,rx:8,class:'d-box'+(s.name===name?' l1':'')},b);
    el('text',{x:12,y:y+25,class:'d-m'},b).textContent=`${s.name.replace(/^GigabitEthernet/,'GE')}  VLAN ${s.vid??'-'}  ${s.ip?s.ip+'/'+s.len:''}`;el('circle',{cx:326,cy:y+20,r:6,class:protoUp(s)?'st-up':'st-down'},b);
    const v=grp(lg,{kb:'vpnpre',id:'vpn'+idx,tip:'绑定 VPN 实例（L3VPN 课程）'});el('rect',{x:352,y,width:108,height:40,rx:8,class:'d-box ghost'},v);el('text',{x:406,y:y+25,class:'d-s','text-anchor':'middle'},v).textContent='→ VPN 实例';});
  // 逻辑接口
  const by=Math.max(500,160+sy+20+subs.length*50);const lo=el('g',{transform:`translate(0,${by})`},g);
  el('text',{x:0,y:0,class:'d-s'},lo).textContent='逻辑接口：不对应任何物理端口，由软件创建';
  [['loopback','LoopBack0',IF.LoopBack0?.ip?'1.1.1.1/32':''],['trunk','Eth-Trunk1','聚合 2 条链路'],['tunnel','Tunnel1','隧道（后续课程）'],['null0','NULL0','黑洞接口']].forEach(([kb,t,s],idx)=>{
    const b=grp(lo,{kb,id:'lg:'+kb,tip:t});const x=idx*228;el('rect',{x,y:14,width:212,height:58,rx:10,class:'d-box'},b);el('text',{x:x+14,y:38,class:'d-m'},b).textContent=t;el('text',{x:x+14,y:58,class:'d-s'},b).textContent=s});
}

/* ============ 引线标注（解剖图谱等风格显示） ============ */
const CALLOUTS={
  chassis:()=>[['chassis','机框'],['fan'],['slot:1'],['slot:5'],['slot:6','主控板（备用）'],['slot:7'],['slot:10'],['pwr0']],
  LPU:()=>[['c:np'],['c:tm'],['c:tcam'],['c:lcpu'],['c:conn'],['c:dcdc'],['c:pic0','子卡 0 · 8×GE'],['c:pic1','子卡 1 · 2×100GE'],['panel','前面板']],
  MPU:()=>[['c:mpu-cpu','主控 CPU'],['c:mem0'],['c:flash'],['c:clock'],['c:conn'],['c:dcdc'],['mgmt']],
  SFU:()=>[['c:sw0'],['c:sw1'],['c:conn'],['c:dcdc'],['panel','前面板']],
  sub:v=>{const L=[['c:phy'],['c:pconn','子卡连接器'],['ppanel','子卡面板']];const c=Object.values(IF).find(i=>i.slot===v.n&&i.pic===v.p&&i.cable);if(c)L.push(['opt:'+c.name],['fib:'+c.name]);L.push([`p:${portIf(v.n,v.p,PICS[v.p].count-1)}:cage`,'端口笼子']);return L}};
const CIRC='①②③④⑤⑥⑦⑧⑨⑩';
function drawCallouts(v){const key=v.k==='chassis'?'chassis':v.k==='board'?slotOf(v.n).type:v.k==='sub'?'sub':null;if(!key)return;
  const sb=scene.getBBox(),cx=sb.x+sb.width/2,g=el('g',{class:'callouts'},scene);
  const items=CALLOUTS[key](v).map(([id,lab])=>{const e=scene.querySelector(`[data-id="${CSS.escape(id)}"]`);if(!e)return null;const b=e.getBBox();const k=KB[e.dataset.kb]||{};
    return {id,ax:b.x+b.width/2,ay:b.y+b.height/2,kb:e.dataset.kb,lab:lab||k.title||id,en:k.en||''}}).filter(Boolean);
  const gap=Math.max(36,sb.height/11);let num=0;
  [['L',items.filter(i=>i.ax<cx)],['R',items.filter(i=>i.ax>=cx)]].forEach(([side,arr])=>{arr.sort((a,b)=>a.ay-b.ay);let prev=-1e9;
    const x0=side==='L'?sb.x-sb.width*.12:sb.x+sb.width*1.12;
    arr.forEach(i=>{const y=Math.max(i.ay,prev+gap);prev=y;const n=CIRC[num++]||'•';
      const c=grp(g,{kb:i.kb,id:'co:'+i.id,tip:i.lab});const ex=side==='L'?x0+28:x0-28;
      el('path',{d:`M${i.ax} ${i.ay} L${ex} ${y} L${x0} ${y}`,class:'co-line'},c);el('circle',{cx:i.ax,cy:i.ay,r:3,class:'co-dot'},c);
      const t=el('text',{x:side==='L'?x0-6:x0+6,y:y+5,class:'co-t','text-anchor':side==='L'?'end':'start'},c);t.textContent=`${n} ${i.lab}`;
      if(i.en){const e2=el('text',{x:side==='L'?x0-6:x0+6,y:y+21,class:'co-e','text-anchor':side==='L'?'end':'start'},c);e2.textContent=i.en}})})}

/* ============ 适配视图 / 缩放平移 ============ */
let vt={k:1,x:0,y:0};const applyVT=()=>vp.setAttribute('transform',`translate(${vt.x},${vt.y}) scale(${vt.k})`);
function fitView(){vt={k:1,x:0,y:0};applyVT();const b=scene.getBBox();const pad=Math.max(b.width,b.height)*.08;
  const r=svg.getBoundingClientRect();const narrow=r.width<600;
  const top=narrow?pad*2.4:pad*1.6;svg.setAttribute('viewBox',`${b.x-pad} ${b.y-top} ${b.width+pad*2} ${b.height+pad+top}`)}
function svgPt(cx,cy){const p=svg.createSVGPoint();p.x=cx;p.y=cy;return p.matrixTransform(svg.getScreenCTM().inverse())}
function zoomAt(f,cx,cy){const p=svgPt(cx,cy);const k=Math.min(8,Math.max(.4,vt.k*f));f=k/vt.k;vt.x=p.x-(p.x-vt.x)*f;vt.y=p.y-(p.y-vt.y)*f;vt.k=k;applyVT()}
svg.addEventListener('wheel',e=>{e.preventDefault();zoomAt(Math.exp(-e.deltaY*.0015),e.clientX,e.clientY)},{passive:false});
const ptrs=new Map();let moved=0,last=null,pinch=null;
svg.addEventListener('pointerdown',e=>{svg.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=0;last=svgPt(e.clientX,e.clientY);
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)}}svg.classList.add('grabbing')});
svg.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId)){hoverTip(e);return}
  const prev=ptrs.get(e.pointerId);moved+=Math.abs(e.clientX-prev.x)+Math.abs(e.clientY-prev.y);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2&&pinch){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);zoomAt(d/pinch.d,(a.x+b.x)/2,(a.y+b.y)/2);pinch.d=d;return}
  const p=svgPt(e.clientX,e.clientY);vt.x+=p.x-last.x;vt.y+=p.y-last.y;applyVT();last=svgPt(e.clientX,e.clientY)});
const endPtr=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(!ptrs.size)svg.classList.remove('grabbing');else{const v=[...ptrs.values()][0];last=svgPt(v.x,v.y)}};
svg.addEventListener('pointerup',e=>{const single=ptrs.size===1&&!pinch;endPtr(e);if(single&&e.button===0)onPick(e)});svg.addEventListener('pointercancel',endPtr);
const tip=document.getElementById('tip'),stage=document.getElementById('stage');
function hoverTip(e){const t=e.target.closest&&e.target.closest('[data-tip]');if(!t){tip.hidden=true;return}const r=stage.getBoundingClientRect();tip.textContent=t.dataset.tip;tip.hidden=false;
  let x=e.clientX-r.left,y=e.clientY-r.top;if(x>r.width-200)x-=200;tip.style.left=x+'px';tip.style.top=y+'px'}
svg.addEventListener('pointerleave',()=>tip.hidden=true);
function onPick(e){if(moved>6)return;const hit=document.elementFromPoint(e.clientX,e.clientY);const t=hit&&hit.closest?hit.closest('[data-kb]'):null;
  scene.querySelectorAll('.sel').forEach(n=>n.classList.remove('sel'));
  if(!t){sel=null;const [k,a]=viewKB(view);showInfo(k,a);return}
  if(t.dataset.go){const [kind,a,b]=t.dataset.go.split(':');const parts=t.dataset.go.slice(kind.length+1);sel=null;
    if(kind==='board'){const g=t;const v=P(0,140,0);g.style.transform=`translate(${v[0]}px,${v[1]}px)`;setTimeout(()=>go({k:'board',n:+a}),260);showInfo(t.dataset.kb);return}
    if(kind==='sub'){go({k:'sub',n:+a,p:+b});return}
    if(kind==='port'){go({k:'port',name:parts});return}}
  sel=t.dataset.id;t.classList.add('sel');showInfo(t.dataset.kb)}
document.getElementById('zin').onclick=()=>{const r=svg.getBoundingClientRect();zoomAt(1.3,r.left+r.width/2,r.top+r.height/2)};
document.getElementById('zout').onclick=()=>{const r=svg.getBoundingClientRect();zoomAt(1/1.3,r.left+r.width/2,r.top+r.height/2)};
document.getElementById('zfit').onclick=fitView;
document.getElementById('xray').onclick=e=>{xray=!xray;e.currentTarget.classList.toggle('on',xray);scene.classList.toggle('xray',xray);if(xray)showInfo('backplane')};
window.addEventListener('resize',()=>{clearTimeout(window._rz);window._rz=setTimeout(fitView,150)});

/* ============ 讲解面板 ============ */
const paneInfo=document.getElementById('pane-info');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let infoKey=null;
function showInfo(key,arg){infoKey=[key,arg];markSeen(key==='iface'?'physif':key);const k=key==='iface'?ifKB(arg):KB[key];if(!k)return;
  let h=`<div class="eyebrow">${esc(k.tag)}</div><h2>${esc(k.title)}</h2><div class="en">${esc(k.en)}</div><p class="sum">${esc(k.sum)}</p>`;
  if(k.rows)h+=`<dl class="kv">${k.rows.map(([a,b])=>`<dt>${esc(a)}</dt><dd>${b}</dd>`).join('')}</dl>`;
  if(k.pts&&k.pts.length)h+=`<h3>要点</h3><ul>${k.pts.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`;
  if(k.cfg)h+=`<div class="cfgbar"><h3>配置示例</h3>${k.run===false?'':'<button class="btn" id="runcfg">在命令行中运行</button>'}</div><pre class="cfg">${k.cfg.map(esc).join('\n')}</pre>${k.note?`<div class="note">${esc(k.note)}</div>`:''}`;
  else if(k.note)h+=`<div class="note">${esc(k.note)}</div>`;
  if(k.links)h+=`<h3>相关概念</h3><div class="chips">${k.links.map(([a,b])=>`<button data-k="${a}">${esc(b)}</button>`).join('')}</div>`;
  if(k.drill)h+=`<div class="note" style="margin-top:14px">↖ ${esc(k.drill)}</div>`;
  paneInfo.innerHTML=h;
  const rb=document.getElementById('runcfg');if(rb)rb.onclick=()=>{setTab('cli');runLines(k.cfg)};
  paneInfo.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>showInfo(b.dataset.k));
}
function setTab(t){document.getElementById('tab-info').classList.toggle('on',t==='info');document.getElementById('tab-cli').classList.toggle('on',t==='cli');
  document.getElementById('pane-info').hidden=t!=='info';document.getElementById('pane-cli').hidden=t!=='cli';if(t==='cli'&&matchMedia('(min-width:861px)').matches)cmd.focus()}
document.getElementById('tab-info').onclick=()=>setTab('info');document.getElementById('tab-cli').onclick=()=>setTab('cli');

/* ============ 动画：报文流 ============ */
const DATA='var(--accent)',CTRL='var(--ctrl)';
function chassisFlows(){const s=n=>SX(n)+26,Dn=D+6,ge=GE_Z(0),hg=HG_Z(0),BP=40,IN=D-60;
  return [
  {name:'数据报文穿越路由器',color:DATA,foot:'全程没有经过主控板 MPU，这就是"分布式转发"。',steps:[
    {t:'报文从 1 号槽接口板的 GigabitEthernet1/0/0 进入路由器',hl:['p:GigabitEthernet1/0/0'],paths:[[[s(1),D+110,ge],[s(1),Dn,ge]]]},
    {t:'1 号槽 LPU 的 NP 查 FIB：目的地址 10.0.13.2 的出接口是 100GE3/1/0，在 3 号槽',hl:['slot:1'],paths:[[[s(1),Dn,ge],[s(1),IN,ge]]]},
    {t:'报文被切成信元，经背板送到交换网板 SFU',hl:['slot:7','backplane'],paths:[[[s(1),IN,ge],[s(1),BP,ge],[s(7),BP,ge]]]},
    {t:'SFU 把信元交换到目的槽位：3 号槽',hl:['slot:7'],paths:[[[s(7),BP,ge],[s(3),BP,ge]]]},
    {t:'3 号槽 LPU 把信元重组成报文，TM 在出方向排队调度',hl:['slot:3'],paths:[[[s(3),BP,ge],[s(3),IN,hg]]]},
    {t:'报文从 100GE3/1/0 发出，前往下一跳',hl:['p:100GE3/1/0'],paths:[[[s(3),IN,hg],[s(3),Dn,hg],[s(3),D+120,hg]]]}]},
  {name:'协议报文上送 + 转发表下发',color:CTRL,foot:'控制平面（MPU）负责"算"，转发平面（LPU）负责"转"。',steps:[
    {t:'邻居发来一个 OSPF Hello 报文，从 GigabitEthernet1/0/0 进入',hl:['p:GigabitEthernet1/0/0'],paths:[[[s(1),D+110,ge],[s(1),Dn,ge]]]},
    {t:'NP 发现它是发给本机的协议报文（目的地址 224.0.0.5），不转发，走上送通道',hl:['slot:1'],paths:[[[s(1),Dn,ge],[s(1),IN,ge]]]},
    {t:'报文经背板的管理通道上送到主用主控板 MPU（5 号槽）',hl:['slot:5','backplane'],paths:[[[s(1),IN,ge],[s(1),BP,ge],[s(5),BP,300],[s(5),IN,300]]]},
    {t:'MPU 运行 OSPF：维护邻居、同步链路状态数据库、计算最短路径，生成路由表 RIB，选优后得到转发表 FIB',hl:['slot:5'],pulse:[s(5),IN,300],dur:2200},
    {t:'MPU 把 FIB 下发到每一块接口板，写进各自 NP 的转发表',hl:LPUS.map(n=>'slot:'+n),paths:LPUS.map(n=>[[s(5),IN,300],[s(5),BP,300],[s(n),BP,300],[s(n),IN,300]])},
    {t:'主用 MPU 同时把状态同步给备用 MPU（6 号槽），主控倒换时业务不中断',hl:['slot:6'],paths:[[[s(5),IN,300],[s(5),BP,300],[s(6),BP,300],[s(6),IN,300]]]}]}]}
function boardFlows(n){if(slotOf(n).type!=='LPU')return[];const Y=412;
  return [
  {name:'报文在接口板内的处理',color:DATA,foot:'这几步在硬件里只需要几微秒。',steps:[
    {t:`光纤里的光信号进入 GigabitEthernet${n}/0/0 的光模块，被转换成电信号`,hl:['p:'+portIf(n,0,0)],paths:[[[55,Y+120,35],[55,Y,35]]]},
    {t:'子卡上的 PHY/MAC 把比特流组装成以太网帧，检查 FCS 校验，坏帧直接丢弃',hl:['c:pic0'],paths:[[[55,Y,35],[55,380,36],[155,300,36]]]},
    {t:'NP 解析报文头，到 TCAM 查 FIB 得到出接口和下一跳；TTL 减 1，重写二层头',hl:['c:np','c:tcam'],paths:[[[155,300,36],[155,175,10],[210,120,44]]]},
    {t:'TM 按优先级把报文放入队列，带宽不够时按策略调度或丢弃，QoS 就在这里执行',hl:['c:tm'],paths:[[[210,120,44],[345,125,20]]]},
    {t:'报文被切成信元，从背板连接器送往交换网板 SFU',hl:['c:conn'],paths:[[[345,125,20],[345,20,48],[345,-100,48]]]}]},
  {name:'转发表下发到接口板',color:CTRL,foot:'接口板 CPU 只管"写表"，逐包转发由 NP 完成。',steps:[
    {t:'主控板算好的 FIB 经背板管理通道送到本板',hl:['c:conn'],paths:[[[470,-100,48],[470,20,48]]]},
    {t:'接口板 CPU 收到表项',hl:['c:lcpu'],paths:[[[470,20,48],[475,90,16]]]},
    {t:'CPU 把表项写进 TCAM 表项存储',hl:['c:tcam'],paths:[[[475,90,16],[475,160,14]]]},
    {t:'之后 NP 转发每个报文时直接查这些表项',hl:['c:np'],paths:[[[475,160,14],[270,120,30]]]}]}]}
function currentFlows(){return view.k==='chassis'?chassisFlows():view.k==='board'?boardFlows(view.n):[]}
const flowsEl=document.getElementById('flows'),cap=document.getElementById('caption');
function flowButtons(){flowsEl.innerHTML='';currentFlows().forEach((f,i)=>{const b=document.createElement('button');b.innerHTML=`<span class="dot" style="background:${f.color}"></span>▶ ${esc(f.name)}`;b.onclick=()=>playFlow(i,0);flowsEl.appendChild(b)})}
let A=null;
function stopFlow(){if(A){cancelAnimationFrame(A.raf);clearTimeout(A.to)}A=null;fx.innerHTML='';cap.hidden=true;scene.querySelectorAll('.flash').forEach(n=>n.classList.remove('flash'));flowsEl.querySelectorAll('button').forEach(b=>b.classList.remove('playing'));
  if(view.k==='chassis')scene.classList.toggle('xray',xray)}
function playFlow(fi,si){const f=currentFlows()[fi];if(!f)return;stopFlow();A={fi,si,f};flowsEl.children[fi]?.classList.add('playing');if(view.k==='chassis')scene.classList.add('xray');runStep()}
function runStep(){const {f,si}=A;const st=f.steps[si];if(!st){A.to=setTimeout(()=>{if(A)A.done=true},10);return}
  scene.querySelectorAll('.flash').forEach(n=>n.classList.remove('flash'));(st.hl||[]).forEach(id=>scene.querySelector(`[data-id="${CSS.escape(id)}"]`)?.classList.add('flash'));
  cap.hidden=false;cap.innerHTML=`<div class="n">${si+1}/${f.steps.length}</div><div class="t">${esc(st.t)}${si===f.steps.length-1?`<small>${esc(f.foot)}</small>`:''}</div><div class="ctl"><button id="cp" aria-label="上一步">‹</button><button id="cn" aria-label="下一步">›</button><button id="cx" aria-label="关闭">✕</button></div>`;
  cap.querySelector('#cp').onclick=()=>{if(A.si>0)jump(A.si-1)};cap.querySelector('#cn').onclick=()=>{if(A.si<f.steps.length-1)jump(A.si+1)};cap.querySelector('#cx').onclick=stopFlow;
  fx.querySelectorAll('.fx-dot,.pulse').forEach(n=>n.remove());
  if(st.pulse){const q=P(...st.pulse);el('circle',{cx:q[0],cy:q[1],r:6,class:'fx-dot',fill:f.color},fx);el('circle',{cx:q[0],cy:q[1],r:4,class:'pulse',stroke:f.color},fx);A.to=setTimeout(next,st.dur||1800);return}
  const lines=(st.paths||[]).map(p=>{const q=p.map(a=>P(...a));let L=0;const seg=[];for(let i=1;i<q.length;i++){const l=Math.hypot(q[i][0]-q[i-1][0],q[i][1]-q[i-1][1]);seg.push(l);L+=l}
    el('polyline',{points:q.map(a=>a.join(',')).join(' '),class:'fx-trail',stroke:f.color},fx);const dot=el('circle',{r:6,class:'fx-dot',fill:f.color},fx);return {q,seg,L,dot}});
  const dur=st.dur||Math.max(900,Math.max(...lines.map(l=>l.L))*5.5),t0=performance.now();
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick=now=>{const t=reduce?1:Math.min(1,(now-t0)/dur);lines.forEach(l=>{let d=t*l.L,i=0;while(i<l.seg.length-1&&d>l.seg[i]){d-=l.seg[i];i++}const r=l.seg[i]?d/l.seg[i]:1;const a=l.q[i],b=l.q[i+1]||a;l.dot.setAttribute('cx',a[0]+(b[0]-a[0])*r);l.dot.setAttribute('cy',a[1]+(b[1]-a[1])*r)});
    if(t<1)A.raf=requestAnimationFrame(tick);else A.to=setTimeout(next,1500)};A.raf=requestAnimationFrame(tick)}
function next(){if(!A)return;if(A.si<A.f.steps.length-1){A.si++;runStep()}}
function jump(i){cancelAnimationFrame(A.raf);clearTimeout(A.to);A.si=i;if(i===0)fx.innerHTML='';runStep()}

/* ============ 命令行 ============ */
const out=document.getElementById('out'),cmd=document.getElementById('cmd'),promptEl=document.getElementById('prompt');
let mode='user',curIf=null;const hist=[];let hi=0;
const prompt=()=>mode==='user'?`<${sysname}>`:mode==='sys'?`[${sysname}]`:`[${sysname}-${curIf}]`;
function print(s,cls){const span=document.createElement('span');if(cls)span.className=cls;span.textContent=s+'\n';out.appendChild(span);out.scrollTop=out.scrollHeight}
const len2mask=l=>{const m=l?(0xffffffff<<(32-l))>>>0:0;return [24,16,8,0].map(s=>(m>>>s)&255).join('.')};
function mask2len(m){if(/^\d+$/.test(m)){const n=+m;return n>=0&&n<=32?n:null}const p=m.split('.').map(Number);if(p.length!==4||p.some(v=>isNaN(v)||v<0||v>255))return null;const b=p.reduce((a,v)=>a*256+v,0).toString(2).padStart(32,'0');return /^1*0*$/.test(b)?b.indexOf('0')===-1?32:b.indexOf('0'):null}
const ipOk=s=>/^(\d{1,3})(\.\d{1,3}){3}$/.test(s)&&s.split('.').every(v=>+v<=255);
function normIf(s){s=s.replace(/\s+/g,'');const m=s.match(/^(gigabitethernet|gigabit|ge|g|100ge|loopback|loop|lo|null|eth-trunk)([\d/]+)(?:\.(\d+))?$/i);if(!m)return null;
  const t=m[1].toLowerCase();const type=/^(g|ge|gigabit|gigabitethernet)$/.test(t)?'GigabitEthernet':t==='100ge'?'100GE':/^lo/.test(t)?'LoopBack':t==='null'?'NULL':'Eth-Trunk';return type+m[2]+(m[3]?'.'+m[3]:'')}
const kw=(tok,word,min=1)=>tok&&tok.length>=min&&word.startsWith(tok.toLowerCase());
const pad=(s,n)=>String(s).padEnd(n);
function sortIfs(){const order={phy:0,sub:1,loop:2,null:3};return Object.values(IF).sort((a,b)=>(order[a.kind]-order[b.kind])||((a.slot||0)-(b.slot||0))||((a.pic||0)-(b.pic||0))||((a.port||0)-(b.port||0))||a.name.localeCompare(b.name,undefined,{numeric:true}))}
function ifCfg(i){const L=[`interface ${i.name}`];if(i.desc)L.push(` description ${i.desc}`);if(i.kind!=='phy'||!i.admin)if(!i.admin)L.push(' shutdown');if(i.vid)L.push(` dot1q termination vid ${i.vid}`);if(i.ip)L.push(` ip address ${i.ip} ${len2mask(i.len)}`);return L}
function exec(line){const raw=line.trim();print(prompt()+raw,'p');if(!raw)return;const t=raw.split(/\s+/),t0=t[0];
  const err=(m)=>print(m||`Error: Unrecognized command found at '^' position.  （演示版支持的命令可输入 ? 查看）`,'e');
  if(t0==='?'||t0==='help'){help();return}
  if(kw(t0,'display',3)){
    const a=t[1];
    if(kw(a,'device',3)){print(`${sysname}'s Device status:\nSlot   Type   Online    Register     Status   Role\n------------------------------------------------------`);SLOTS.forEach(s=>print(`${pad(s.n,7)}${pad(s.type||'-',7)}${pad(s.type?'Present':'Absent',10)}${pad(s.type?(s.role==='主用'?'NA':'Registered'):'-',13)}${pad(s.type?'Normal':'-',9)}${s.role==='主用'?'Master':s.role==='备用'?'Slave':s.type?'NA':'-'}`));['PWR1','PWR2','PWR3','PWR4','FAN'].forEach(p=>print(`${pad(p,7)}${pad(p==='FAN'?'FAN':'PWR',7)}${pad('Present',10)}${pad('Registered',13)}${pad('Normal',9)}NA`));return}
    if(kw(a,'version',1)){print(`Demo Router Software, Version 1.0 (教学模拟)\n${sysname} uptime is 0 week, 0 day, 1 hour\nMPU(Master) 5 : uptime is 0 week, 0 day, 1 hour\nMPU(Slave)  6 : uptime is 0 week, 0 day, 1 hour`);return}
    if(kw(a,'interface',3)&&kw(t[2],'brief',1)){print('PHY: Physical\n*down: administratively down\nInterface                        PHY      Protocol');sortIfs().forEach(i=>print(`${pad(i.name,33)}${pad(i.admin?phyUp(i)?'up':'down':'*down',9)}${protoUp(i)?'up':'down'}`));return}
    if(kw(a,'ip',2)&&kw(t[2],'interface',3)&&kw(t[3],'brief',1)){print('*down: administratively down\nInterface                        IP Address/Mask      Physical   Protocol');sortIfs().filter(i=>i.ip||i.kind==='null').forEach(i=>print(`${pad(i.name,33)}${pad(i.ip?i.ip+'/'+i.len:'unassigned',21)}${pad(i.admin?phyUp(i)?'up':'down':'*down',11)}${protoUp(i)?'up':'down'}`));return}
    if(kw(a,'interface',3)&&t[2]){const n=normIf(t.slice(2).join(''));const i=IF[n];if(!i){err('Error: Wrong parameter found at \'^\' position.');return}
      print(`${n} current state : ${i.admin?phyUp(i)?'UP':'DOWN':'Administratively DOWN'}\nLine protocol current state : ${protoUp(i)?'UP':'DOWN'}\nDescription: ${i.desc||''}\nRoute Port,The Maximum Transmit Unit is 1500\nInternet Address is ${i.ip?i.ip+'/'+i.len:'not configured'}\nIP Sending Frames' Format is PKTFMT_ETHNT_2, Hardware address is ${macOf(i.parent||n)}${i.speed?`\nPort BW: ${i.speed.replace('bps','')}, Transceiver: ${i.cable?i.optic:'absent'}`:''}`);return}
    if(kw(a,'transceiver',2)){const n=normIf(t.slice(3).join(''));const i=IF[n];if(!i||i.kind!=='phy'){err('Error: Wrong parameter found at \'^\' position.');return}if(!i.cable){print(`${n} transceiver information:\nThe transceiver is absent.`);return}
      print(`${n} transceiver information:\n-------------------------------------------\n Transceiver Type      : ${i.optic==='SFP'?'1000_BASE_LX_SFP':'100GBASE_LR4_QSFP28'}\n Connector Type        : LC\n Wavelength(nm)        : ${i.optic==='SFP'?'1310':'1295/1300/1304/1309'}\n Transfer Distance(m)  : 10000(9um)\n Current Rx Power(dBm) : -5.62\n Current Tx Power(dBm) : -2.31\n Default Rx Power High Threshold(dBm) : 0.50\n Default Rx Power Low  Threshold(dBm) : -20.00`);return}
    if(kw(a,'this',2)){if(mode==='if')ifCfg(IF[curIf]).concat(['#','return']).forEach(l=>print(l));else if(mode==='sys')print(`#\n sysname ${sysname}\n#\nreturn`);else err();return}
    if(kw(a,'current-configuration',3)){print(`#\nsysname ${sysname}\n#`);sortIfs().filter(i=>i.ip||i.desc||!i.admin||i.kind!=='phy').forEach(i=>{ifCfg(i).forEach(l=>print(l));print('#')});print('return');return}
    err();return}
  if(kw(t0,'system-view',3)){if(mode==='user'){mode='sys';print('Enter system view, return user view with return command.','h')}return}
  if(kw(t0,'return',3)){mode='user';curIf=null;return}
  if(kw(t0,'quit',1)){if(mode==='if'){mode='sys';curIf=null}else if(mode==='sys')mode='user';return}
  if(mode==='user'){err();return}
  if(kw(t0,'sysname',3)&&mode==='sys'&&t[1]){sysname=t[1].slice(0,30);refresh();return}
  if(kw(t0,'interface',3)){const n=normIf(t.slice(1).join(''));if(!n){err('Error: Wrong parameter found at \'^\' position.');return}
    if(!IF[n]){const base=n.split('.')[0];if(n.includes('.')&&IF[base]&&IF[base].kind==='phy'){addIf(n,{kind:'sub',parent:base})}else if(/^LoopBack\d+$/.test(n)){addIf(n,{kind:'loop'})}else if(n.startsWith('Eth-Trunk')){err('Info: 演示版暂不支持 Eth-Trunk。');return}else{err(`Error: 接口 ${n} 不存在。本机接口板在 ${LPUS.join('、')} 号槽，GE 端口 0-7，100GE 端口 0-1。`);return}refresh()}
    mode='if';curIf=n;return}
  if(mode!=='if'){err();return}
  const i=IF[curIf];const undo=kw(t0,'undo',2);const c=undo?t.slice(1):t;
  if(kw(c[0],'shutdown',4)){if(i.kind==='null'){err('Error: NULL 接口不支持该操作。');return}i.admin=undo;refresh();return}
  if(kw(c[0],'description',4)){i.desc=undo?'':c.slice(1).join(' ').slice(0,60);refresh();return}
  if(kw(c[0],'ip',2)&&kw(c[1],'address',3)){if(i.kind==='null'){err('Error: NULL 接口不能配置 IP 地址。');return}
    if(undo){i.ip=null;i.len=null;refresh();return}if(!ipOk(c[2]||'')){err('Error: Wrong parameter found at \'^\' position.  格式：ip address 10.1.1.1 255.255.255.252 或 ip address 10.1.1.1 30');return}
    const L=mask2len(c[3]||'');if(L==null){err('Error: 掩码无效。');return}
    const dup=Object.values(IF).find(o=>o!==i&&o.ip&&o.len&&L&&sameNet(o.ip,o.len,c[2],L));if(dup){err(`Error: The specified IP address conflicts with ${dup.name}.`);return}
    i.ip=c[2];i.len=L;refresh();return}
  if(kw(c[0],'dot1q',3)){if(i.kind!=='sub'){err('Error: 只有子接口才能配置 dot1q termination vid。');return}if(undo){i.vid=null;refresh();return}const v=+c[3];if(!(v>=1&&v<=4094)){err('Error: VLAN ID 范围是 1-4094。');return}i.vid=v;refresh();return}
  err()}
function ip2n(s){return s.split('.').reduce((a,v)=>a*256+ +v,0)}
function sameNet(a,la,b,lb){const l=Math.min(la,lb);if(!l)return false;const m=Math.pow(2,32-l);return Math.floor(ip2n(a)/m)===Math.floor(ip2n(b)/m)}
function help(){const H={user:['display device            查看单板状态','display version           查看软件版本','display interface brief   查看所有接口状态','display ip interface brief  查看三层接口','display interface <名称>   查看接口详情','display transceiver interface <名称>  查看光模块','display current-configuration  查看当前配置','system-view               进入系统视图'],
  sys:['interface <名称>          进入接口视图，如 interface GE1/0/2','interface GE1/0/0.300     创建子接口','interface LoopBack1       创建环回接口','sysname <名字>            修改设备名','display ...               任意视图都能用','quit / return             返回'],
  if:['ip address <IP> <掩码>    配置 IP，掩码可写 24 或 255.255.255.0','undo ip address           删除 IP','shutdown / undo shutdown  关闭 / 打开接口','description <文字>        接口描述','dot1q termination vid <N> 子接口终结 VLAN','display this              查看本接口配置','quit                      返回系统视图']};
  H[mode].forEach(l=>print(l,'h'))}
function refresh(){promptEl.textContent=prompt();const keepVT={...vt};render(view,{fit:false,animate:false});vt=keepVT;applyVT();if(infoKey&&infoKey[0]==='iface')showInfo('iface',infoKey[1])}
function runLines(lines){let d=0;lines.forEach(l=>setTimeout(()=>{exec(l);promptEl.textContent=prompt()},d+=260))}
cmd.addEventListener('keydown',e=>{if(e.key==='Enter'){const v=cmd.value;if(v.trim()){hist.push(v)}hi=hist.length;cmd.value='';exec(v);promptEl.textContent=prompt()}
  else if(e.key==='ArrowUp'){if(hi>0){hi--;cmd.value=hist[hi]}e.preventDefault()}else if(e.key==='ArrowDown'){if(hi<hist.length){hi++;cmd.value=hist[hi]||''}e.preventDefault()}});
const chipsEl=document.getElementById('chips');
['display device','display interface brief','display ip interface brief','display current-configuration','?'].forEach(c=>{const b=document.createElement('button');b.textContent=c;b.onclick=()=>{exec(c);promptEl.textContent=prompt()};chipsEl.appendChild(b)});
print('欢迎使用模拟路由器 R1。输入 ? 查看当前视图可用的命令。\n试试：display device','h');

/* ============ 启动 ============ */
/* ============ 风格与探索进度 ============ */
const SKINS=[
  ['notebook','手账笔记',['#2b59c3','#ffde59','#f3f6fb'],'方格纸、手绘线条、荧光笔标题'],
  ['anatomy','解剖图谱',['#9e2b25','#e8b4a0','#efe6d6'],'像医学解剖图：剖面、阴影线、编号引线标注'],
  ['whiteboard','白板手绘',['#1d1d1f','#e8453c','#ffffff'],'白板马克笔，草图感，手写标注'],
  ['chalk','黑板粉笔',['#2c4a3e','#f5e27a','#f4a3b5'],'课堂黑板，彩色粉笔勾画'],
  ['ink','水墨国风',['#222222','#c0392b','#efece4'],'宣纸水墨，朱红印章色点缀'],
  ['blueprint','晒图蓝图',['#0d3b78','#dbe9ff','#5fa8ff'],'工程晒图，白线描在深蓝底上'],
  ['pixel','像素游戏',['#1d2b53','#ff004d','#ffec27'],'8-bit 复古游戏机配色'],
  ['neon','霓虹机房',['#070b1a','#19e3ff','#ff3dbb'],'深色科幻，发光描边'],
  ['blocks','积木乐园',['#bfe3ff','#ff8a3d','#8c6bff'],'粗描边、高饱和，板卡按类型上色'],
  ['eng','工程素描',['#e8ecef','#0a7c89','#9ca7b0'],'冷静克制的工业设计稿']];
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const skinsEl=document.getElementById('skins');
const swatch=c=>`<span class="sw" style="background:linear-gradient(135deg,${c[2]} 0 40%,${c[0]} 40% 70%,${c[1]} 70%)"></span>`;
skinsEl.innerHTML=`<button id="skinbtn" aria-haspopup="true" aria-expanded="false"></button><div class="skinmenu" id="skinmenu" hidden role="menu"></div>`;
const skinBtn=document.getElementById('skinbtn'),skinMenu=document.getElementById('skinmenu');
SKINS.forEach(([id,name,c,desc])=>{const b=document.createElement('button');b.dataset.s=id;b.setAttribute('role','menuitemradio');b.innerHTML=`${swatch(c)}<span><b>${name}</b><small>${desc}</small></span>`;b.onclick=()=>{setSkin(id);skinMenu.hidden=true;skinBtn.setAttribute('aria-expanded','false')};skinMenu.appendChild(b)});
skinBtn.onclick=e=>{e.stopPropagation();skinMenu.hidden=!skinMenu.hidden;skinBtn.setAttribute('aria-expanded',String(!skinMenu.hidden))};
document.addEventListener('click',e=>{if(!skinsEl.contains(e.target)){skinMenu.hidden=true;skinBtn.setAttribute('aria-expanded','false')}});
function setSkin(id){const k=SKINS.find(s=>s[0]===id)||SKINS[0];document.documentElement.dataset.skin=k[0];store.set('dc-skin',k[0]);
  skinBtn.innerHTML=`${swatch(k[2])}风格：${k[1]} ▾`;skinMenu.querySelectorAll('button').forEach(b=>b.setAttribute('aria-checked',b.dataset.s===k[0]));setTimeout(fitView,60)}
let seen=new Set();try{seen=new Set(JSON.parse(store.get('dc-seen')||'[]'))}catch(e){}
function markSeen(k){if(!KB[k])return;const isNew=!seen.has(k);seen.add(k);if(isNew)store.set('dc-seen',JSON.stringify([...seen]));updXP(isNew)}
function updXP(pop){const n=[...seen].filter(k=>KB[k]).length,t=Object.keys(KB).length;document.getElementById('xpn').textContent=`${n}/${t}`;document.getElementById('xpb').style.width=(n/t*100)+'%';
  if(pop){const x=document.getElementById('xp');x.classList.remove('pop');void x.offsetWidth;x.classList.add('pop')}}
setSkin(store.get('dc-skin')||'notebook');
render({k:'chassis'},{animate:false});showInfo('chassis');
