from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from textwrap import dedent
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


SLIDE_WIDTH = 12192000
SLIDE_HEIGHT = 6858000

OUTPUT_NAME = "BibTeX自动获取工具-使用说明.pptx"


def xml_text(value: str) -> str:
    return escape(value, {'"': "&quot;"})   


def clean_xml(value: str) -> str:
    return value.lstrip()


def paragraph_xml(
    text: str,
    *,
    size: int = 2200,
    bold: bool = False,
    color: str = "1F2937",
    align: str = "l",
) -> str:
    if not text:
        return f'<a:p><a:endParaRPr lang="zh-CN" sz="{size}"/></a:p>'

    bold_attr = ' b="1"' if bold else ""
    return dedent(
        f"""\
        <a:p>
          <a:pPr algn="{align}">
            <a:buNone/>
          </a:pPr>
          <a:r>
            <a:rPr lang="zh-CN" sz="{size}"{bold_attr}>
              <a:solidFill>
                <a:srgbClr val="{color}"/>
              </a:solidFill>
              <a:latin typeface="Aptos"/>
              <a:ea typeface="Microsoft YaHei"/>
              <a:cs typeface="Aptos"/>
            </a:rPr>
            <a:t>{xml_text(text)}</a:t>
          </a:r>
          <a:endParaRPr lang="zh-CN" sz="{size}"/>
        </a:p>
        """
    )


def text_box_xml(
    shape_id: int,
    name: str,
    *,
    x: int,
    y: int,
    cx: int,
    cy: int,
    paragraphs: list[dict[str, object]],
) -> str:
    paragraph_block = "".join(
        paragraph_xml(
            str(p["text"]),
            size=int(p.get("size", 2200)),
            bold=bool(p.get("bold", False)),
            color=str(p.get("color", "1F2937")),
            align=str(p.get("align", "l")),
        )
        for p in paragraphs
    )

    return dedent(
        f"""\
        <p:sp>
          <p:nvSpPr>
            <p:cNvPr id="{shape_id}" name="{xml_text(name)}"/>
            <p:cNvSpPr txBox="1"/>
            <p:nvPr/>
          </p:nvSpPr>
          <p:spPr>
            <a:xfrm>
              <a:off x="{x}" y="{y}"/>
              <a:ext cx="{cx}" cy="{cy}"/>
            </a:xfrm>
            <a:prstGeom prst="rect">
              <a:avLst/>
            </a:prstGeom>
            <a:noFill/>
            <a:ln>
              <a:noFill/>
            </a:ln>
          </p:spPr>
          <p:txBody>
            <a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t"/>
            <a:lstStyle/>
            {paragraph_block}
          </p:txBody>
        </p:sp>
        """
    )


def rectangle_xml(
    shape_id: int,
    name: str,
    *,
    x: int,
    y: int,
    cx: int,
    cy: int,
    fill: str,
) -> str:
    return dedent(
        f"""\
        <p:sp>
          <p:nvSpPr>
            <p:cNvPr id="{shape_id}" name="{xml_text(name)}"/>
            <p:cNvSpPr/>
            <p:nvPr/>
          </p:nvSpPr>
          <p:spPr>
            <a:xfrm>
              <a:off x="{x}" y="{y}"/>
              <a:ext cx="{cx}" cy="{cy}"/>
            </a:xfrm>
            <a:prstGeom prst="rect">
              <a:avLst/>
            </a:prstGeom>
            <a:solidFill>
              <a:srgbClr val="{fill}"/>
            </a:solidFill>
            <a:ln>
              <a:noFill/>
            </a:ln>
          </p:spPr>
        </p:sp>
        """
    )


def base_slide_xml(shapes: list[str]) -> str:
    shapes_xml = "\n".join(shapes)
    return dedent(
        f"""\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
               xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
               xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:cSld>
            <p:spTree>
              <p:nvGrpSpPr>
                <p:cNvPr id="1" name=""/>
                <p:cNvGrpSpPr/>
                <p:nvPr/>
              </p:nvGrpSpPr>
              <p:grpSpPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="0" cy="0"/>
                  <a:chOff x="0" y="0"/>
                  <a:chExt cx="0" cy="0"/>
                </a:xfrm>
              </p:grpSpPr>
              {shapes_xml}
            </p:spTree>
          </p:cSld>
          <p:clrMapOvr>
            <a:masterClrMapping/>
          </p:clrMapOvr>
        </p:sld>
        """
    )


def build_cover_slide() -> str:
    shapes = [
        rectangle_xml(2, "Top Band", x=0, y=0, cx=SLIDE_WIDTH, cy=1800000, fill="0F766E"),
        text_box_xml(
            3,
            "Cover Title",
            x=640000,
            y=350000,
            cx=10800000,
            cy=700000,
            paragraphs=[
                {"text": "BibTeX 自动获取工具", "size": 3200, "bold": True, "color": "FFFFFF"},
            ],
        ),
        text_box_xml(
            4,
            "Cover Subtitle",
            x=640000,
            y=1150000,
            cx=10800000,
            cy=600000,
            paragraphs=[
                {
                    "text": "网页选中即取 BibTeX 的 Tampermonkey 用户脚本",
                    "size": 2000,
                    "color": "D1FAE5",
                },
            ],
        ),
        text_box_xml(
            5,
            "Cover Body",
            x=860000,
            y=2350000,
            cx=10000000,
            cy=2400000,
            paragraphs=[
                {"text": "使用说明 PPT（5页版）", "size": 2400, "bold": True, "color": "0F172A"},
                {"text": "", "size": 1200},
                {"text": "版本：v1.5", "size": 1900, "color": "334155"},
                {"text": "主文件：bibtex-getter.user.js", "size": 1900, "color": "334155"},
                {
                    "text": "适用场景：论文网页、PDF 在线阅读器、Google Scholar 等",
                    "size": 1900,
                    "color": "334155",
                },
            ],
        ),
        text_box_xml(
            6,
            "Cover Footer",
            x=860000,
            y=6050000,
            cx=10000000,
            cy=260000,
            paragraphs=[
                {"text": "基于 README 与 bibtex-getter.user.js 整理", "size": 1300, "color": "64748B", "align": "r"},
            ],
        ),
    ]
    return base_slide_xml(shapes)


def build_content_slide(title: str, lines: list[str], footer: str) -> str:
    body_paragraphs = [{"text": line, "size": 2000 if line.startswith("提示：") else 2200, "color": "1F2937"} for line in lines]
    shapes = [
        rectangle_xml(2, "Top Band", x=0, y=0, cx=SLIDE_WIDTH, cy=930000, fill="0F766E"),
        text_box_xml(
            3,
            "Slide Title",
            x=620000,
            y=200000,
            cx=10800000,
            cy=420000,
            paragraphs=[
                {"text": title, "size": 2700, "bold": True, "color": "FFFFFF"},
            ],
        ),
        text_box_xml(
            4,
            "Slide Body",
            x=720000,
            y=1280000,
            cx=10600000,
            cy=4300000,
            paragraphs=body_paragraphs,
        ),
        text_box_xml(
            5,
            "Slide Footer",
            x=720000,
            y=6100000,
            cx=10600000,
            cy=240000,
            paragraphs=[
                {"text": footer, "size": 1300, "color": "64748B", "align": "r"},
            ],
        ),
    ]
    return base_slide_xml(shapes)


def slide_relationship_xml() -> str:
    return dedent(
        """\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
        </Relationships>
        """
    )


def slide_layout_xml() -> str:
    return dedent(
        """\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                     xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                     xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     type="blank" preserve="1" showMasterSp="1">
          <p:cSld name="Blank">
            <p:spTree>
              <p:nvGrpSpPr>
                <p:cNvPr id="1" name=""/>
                <p:cNvGrpSpPr/>
                <p:nvPr/>
              </p:nvGrpSpPr>
              <p:grpSpPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="0" cy="0"/>
                  <a:chOff x="0" y="0"/>
                  <a:chExt cx="0" cy="0"/>
                </a:xfrm>
              </p:grpSpPr>
            </p:spTree>
          </p:cSld>
          <p:clrMapOvr>
            <a:masterClrMapping/>
          </p:clrMapOvr>
        </p:sldLayout>
        """
    )


def slide_layout_rels_xml() -> str:
    return dedent(
        """\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
        </Relationships>
        """
    )


def slide_master_xml() -> str:
    return dedent(
        """\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                     xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                     xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:cSld name="Simple Master">
            <p:bg>
              <p:bgRef idx="1001">
                <a:schemeClr val="bg1"/>
              </p:bgRef>
            </p:bg>
            <p:spTree>
              <p:nvGrpSpPr>
                <p:cNvPr id="1" name=""/>
                <p:cNvGrpSpPr/>
                <p:nvPr/>
              </p:nvGrpSpPr>
              <p:grpSpPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="0" cy="0"/>
                  <a:chOff x="0" y="0"/>
                  <a:chExt cx="0" cy="0"/>
                </a:xfrm>
              </p:grpSpPr>
            </p:spTree>
          </p:cSld>
          <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
          <p:sldLayoutIdLst>
            <p:sldLayoutId id="2147483649" r:id="rId1"/>
          </p:sldLayoutIdLst>
          <p:txStyles>
            <p:titleStyle>
              <a:lvl1pPr algn="l">
                <a:defRPr sz="3200" b="1"/>
              </a:lvl1pPr>
            </p:titleStyle>
            <p:bodyStyle>
              <a:lvl1pPr marL="0" indent="0">
                <a:defRPr sz="2200"/>
              </a:lvl1pPr>
            </p:bodyStyle>
            <p:otherStyle>
              <a:lvl1pPr marL="0" indent="0">
                <a:defRPr sz="1800"/>
              </a:lvl1pPr>
            </p:otherStyle>
          </p:txStyles>
        </p:sldMaster>
        """
    )


def slide_master_rels_xml() -> str:
    return dedent(
        """\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
          <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
        </Relationships>
        """
    )


def theme_xml() -> str:
    return dedent(
        """\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="BibTeX Getter Theme">
          <a:themeElements>
            <a:clrScheme name="BibTeX Getter">
              <a:dk1><a:srgbClr val="0F172A"/></a:dk1>
              <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
              <a:dk2><a:srgbClr val="334155"/></a:dk2>
              <a:lt2><a:srgbClr val="F8FAFC"/></a:lt2>
              <a:accent1><a:srgbClr val="0F766E"/></a:accent1>
              <a:accent2><a:srgbClr val="2563EB"/></a:accent2>
              <a:accent3><a:srgbClr val="EA580C"/></a:accent3>
              <a:accent4><a:srgbClr val="7C3AED"/></a:accent4>
              <a:accent5><a:srgbClr val="DC2626"/></a:accent5>
              <a:accent6><a:srgbClr val="4F46E5"/></a:accent6>
              <a:hlink><a:srgbClr val="2563EB"/></a:hlink>
              <a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink>
            </a:clrScheme>
            <a:fontScheme name="BibTeX Getter">
              <a:majorFont>
                <a:latin typeface="Aptos Display"/>
                <a:ea typeface="Microsoft YaHei"/>
                <a:cs typeface="Aptos"/>
              </a:majorFont>
              <a:minorFont>
                <a:latin typeface="Aptos"/>
                <a:ea typeface="Microsoft YaHei"/>
                <a:cs typeface="Aptos"/>
              </a:minorFont>
            </a:fontScheme>
            <a:fmtScheme name="BibTeX Getter">
              <a:fillStyleLst>
                <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
                <a:solidFill><a:schemeClr val="accent1"/></a:solidFill>
                <a:solidFill><a:schemeClr val="accent2"/></a:solidFill>
              </a:fillStyleLst>
              <a:lnStyleLst>
                <a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
                <a:ln w="25400"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill><a:prstDash val="solid"/></a:ln>
                <a:ln w="38100"><a:solidFill><a:schemeClr val="accent2"/></a:solidFill><a:prstDash val="solid"/></a:ln>
              </a:lnStyleLst>
              <a:effectStyleLst>
                <a:effectStyle><a:effectLst/></a:effectStyle>
                <a:effectStyle><a:effectLst/></a:effectStyle>
                <a:effectStyle><a:effectLst/></a:effectStyle>
              </a:effectStyleLst>
              <a:bgFillStyleLst>
                <a:solidFill><a:schemeClr val="lt1"/></a:solidFill>
                <a:solidFill><a:schemeClr val="lt2"/></a:solidFill>
                <a:solidFill><a:schemeClr val="dk1"/></a:solidFill>
              </a:bgFillStyleLst>
            </a:fmtScheme>
          </a:themeElements>
          <a:objectDefaults/>
          <a:extraClrSchemeLst/>
        </a:theme>
        """
    )


def presentation_xml(slide_count: int) -> str:
    slide_ids = "\n".join(
        f'    <p:sldId id="{256 + i}" r:id="rId{i + 2}"/>' for i in range(slide_count)
    )
    return dedent(
        f"""\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                        xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                        xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:sldMasterIdLst>
            <p:sldMasterId id="2147483648" r:id="rId1"/>
          </p:sldMasterIdLst>
          <p:sldIdLst>
{slide_ids}
          </p:sldIdLst>
          <p:sldSz cx="{SLIDE_WIDTH}" cy="{SLIDE_HEIGHT}"/>
          <p:notesSz cx="6858000" cy="9144000"/>
          <p:defaultTextStyle>
            <a:defPPr/>
            <a:lvl1pPr marL="0" indent="0"/>
            <a:lvl2pPr marL="0" indent="0"/>
            <a:lvl3pPr marL="0" indent="0"/>
          </p:defaultTextStyle>
        </p:presentation>
        """
    )


def presentation_rels_xml(slide_count: int) -> str:
    rels = [
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'
    ]
    for i in range(slide_count):
        rels.append(
            f'<Relationship Id="rId{i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i + 1}.xml"/>'
        )
    rels.extend(
        [
            f'<Relationship Id="rId{slide_count + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>',
            f'<Relationship Id="rId{slide_count + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml"/>',
            f'<Relationship Id="rId{slide_count + 4}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles" Target="tableStyles.xml"/>',
        ]
    )
    rels_xml = "\n  ".join(rels)
    return dedent(
        f"""\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          {rels_xml}
        </Relationships>
        """
    )


def content_types_xml(slide_count: int) -> str:
    slide_overrides = "\n".join(
        f'  <Override PartName="/ppt/slides/slide{i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        for i in range(slide_count)
    )
    return dedent(
        f"""\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
          <Default Extension="xml" ContentType="application/xml"/>
          <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
{slide_overrides}
          <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
          <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
          <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
          <Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>
          <Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>
          <Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>
          <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
          <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
        </Types>
        """
    )


def root_rels_xml() -> str:
    return dedent(
        """\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
          <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
          <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
        </Relationships>
        """
    )


def app_props_xml(titles: list[str]) -> str:
    title_parts = "\n".join(f"      <vt:lpstr>{xml_text(title)}</vt:lpstr>" for title in titles)
    return dedent(
        f"""\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
                    xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
          <Application>Microsoft Office PowerPoint</Application>
          <PresentationFormat>Widescreen</PresentationFormat>
          <Slides>{len(titles)}</Slides>
          <Notes>0</Notes>
          <HiddenSlides>0</HiddenSlides>
          <MMClips>0</MMClips>
          <ScaleCrop>false</ScaleCrop>
          <HeadingPairs>
            <vt:vector size="2" baseType="variant">
              <vt:variant><vt:lpstr>Slides</vt:lpstr></vt:variant>
              <vt:variant><vt:i4>{len(titles)}</vt:i4></vt:variant>
            </vt:vector>
          </HeadingPairs>
          <TitlesOfParts>
            <vt:vector size="{len(titles)}" baseType="lpstr">
{title_parts}
            </vt:vector>
          </TitlesOfParts>
          <Company></Company>
          <LinksUpToDate>false</LinksUpToDate>
          <SharedDoc>false</SharedDoc>
          <HyperlinksChanged>false</HyperlinksChanged>
          <AppVersion>16.0000</AppVersion>
        </Properties>
        """
    )


def core_props_xml() -> str:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return dedent(
        f"""\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                           xmlns:dc="http://purl.org/dc/elements/1.1/"
                           xmlns:dcterms="http://purl.org/dc/terms/"
                           xmlns:dcmitype="http://purl.org/dc/dcmitype/"
                           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <dc:title>BibTeX 自动获取工具使用说明</dc:title>
          <dc:creator>Codex</dc:creator>
          <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
          <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
          <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
        </cp:coreProperties>
        """
    )


def pres_props_xml() -> str:
    return dedent(
        """\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                          xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:showPr showAnimation="1" showNarration="1" useTimings="0"/>
        </p:presentationPr>
        """
    )


def view_props_xml() -> str:
    return dedent(
        """\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:viewPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                  lastView="sldView">
          <p:normalViewPr>
            <p:restoredLeft sz="15620"/>
            <p:restoredTop sz="94660" autoAdjust="1"/>
          </p:normalViewPr>
          <p:slideViewPr>
            <p:cSldViewPr snapToGrid="1" snapToObjects="1"/>
          </p:slideViewPr>
          <p:guideLst/>
        </p:viewPr>
        """
    )


def table_styles_xml() -> str:
    return dedent(
        """\
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                       def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>
        """
    )


def build_deck() -> tuple[list[str], list[str]]:
    titles = [
        "封面",
        "安装与启动",
        "基本使用流程",
        "进阶功能",
        "Google Scholar 与建议",
    ]

    slides = [
        build_cover_slide(),
        build_content_slide(
            "安装与启动",
            [
                "1. 先在浏览器中安装 Tampermonkey 扩展。",
                "2. 打开 Tampermonkey，创建新脚本。",
                "3. 将 bibtex-getter.user.js 全部内容粘贴进去并保存。",
                "4. 刷新任意网页，右下角看到 Get BibTeX 按钮即表示安装成功。",
                "5. 如按钮未出现，优先检查扩展是否启用、脚本是否启用、按钮是否被隐藏。",
                "",
                "提示：支持 Chrome、Firefox、Edge 等安装了 Tampermonkey 的浏览器。",
            ],
            "第 2 页 | 安装完成后即可在任意网页使用",
        ),
        build_content_slide(
            "基本使用流程",
            [
                "1. 在网页上选中论文标题、作者名、DOI 或搜索关键词。",
                "2. 左键点击 Get BibTeX 可直接复制；右键点击可先预览再复制。",
                "3. 也可以使用快捷键 Ctrl+Shift+B 触发获取。",
                "4. 脚本的处理顺序为：检测 DOI -> DBLP -> Crossref。",
                "5. 获取成功后，BibTeX 会自动写入剪贴板并显示提示。",
                "",
                "提示：DBLP 更适合计算机科学论文，Crossref 负责通用回退。",
            ],
            "第 3 页 | 最常用的一页，适合现场演示",
        ),
        build_content_slide(
            "进阶功能",
            [
                "1. DOI 直连：选中文本中包含 DOI 时，会优先按 DOI 直接获取 BibTeX。",
                "2. 多结果选择：Crossref 返回多条记录时，会弹窗让用户手动选择。",
                "3. 摘要补全：若 BibTeX 缺少 abstract，会按 DOI 向 Crossref、Semantic Scholar、OpenAlex 尝试补齐。",
                "4. 搜索历史：自动保存最近 20 条记录，可再次预览、复制或清空。",
                "5. 历史导出：支持导出 bibtex-history.bib，方便导入文献管理工具。",
                "6. 其他细节：1 小时缓存、多语言提示、按钮显示/隐藏。",
            ],
            "第 4 页 | 适合说明脚本比普通复制工具更强的地方",
        ),
        build_content_slide(
            "Google Scholar 与使用建议",
            [
                "1. 在 scholar.google.* 页面，脚本会增强可用的 BibTeX 导出链接。",
                "2. 点击增强后的链接后，可直接请求并复制 BibTeX 内容。",
                "3. 建议优先选完整论文标题；如果页面有 DOI，优先直接选 DOI。",
                "4. 不确定结果是否准确时，优先使用右键预览模式。",
                "5. 搜不到结果时，通常是关键词不够准，或条目未被 DBLP / Crossref 收录。",
                "6. 没有摘要时，通常是条目无 DOI，或外部数据源没有提供 abstract。",
            ],
            "第 5 页 | 结束页可顺带讲常见问题与最佳实践",
        ),
    ]

    return titles, slides


def write_pptx(output_path: Path) -> None:
    titles, slides = build_deck()
    slide_count = len(slides)

    with ZipFile(output_path, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", clean_xml(content_types_xml(slide_count)))
        archive.writestr("_rels/.rels", clean_xml(root_rels_xml()))
        archive.writestr("docProps/app.xml", clean_xml(app_props_xml(titles)))
        archive.writestr("docProps/core.xml", clean_xml(core_props_xml()))
        archive.writestr("ppt/presentation.xml", clean_xml(presentation_xml(slide_count)))
        archive.writestr("ppt/_rels/presentation.xml.rels", clean_xml(presentation_rels_xml(slide_count)))
        archive.writestr("ppt/presProps.xml", clean_xml(pres_props_xml()))
        archive.writestr("ppt/viewProps.xml", clean_xml(view_props_xml()))
        archive.writestr("ppt/tableStyles.xml", clean_xml(table_styles_xml()))
        archive.writestr("ppt/theme/theme1.xml", clean_xml(theme_xml()))
        archive.writestr("ppt/slideMasters/slideMaster1.xml", clean_xml(slide_master_xml()))
        archive.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", clean_xml(slide_master_rels_xml()))
        archive.writestr("ppt/slideLayouts/slideLayout1.xml", clean_xml(slide_layout_xml()))
        archive.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", clean_xml(slide_layout_rels_xml()))

        for index, slide_xml in enumerate(slides, start=1):
            archive.writestr(f"ppt/slides/slide{index}.xml", clean_xml(slide_xml))
            archive.writestr(f"ppt/slides/_rels/slide{index}.xml.rels", clean_xml(slide_relationship_xml()))


def main() -> None:
    root = Path(__file__).resolve().parent
    output_path = root / OUTPUT_NAME
    write_pptx(output_path)
    print(output_path)


if __name__ == "__main__":
    main()
