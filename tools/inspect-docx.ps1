param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$resolvedPath = (Resolve-Path -LiteralPath $Path).Path
$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedPath)
try {
    $documentEntry = $archive.GetEntry('word/document.xml')
    if (-not $documentEntry) {
        throw "No se encontró word/document.xml en $resolvedPath"
    }

    $reader = [System.IO.StreamReader]::new($documentEntry.Open())
    try {
        [xml]$document = $reader.ReadToEnd()
    }
    finally {
        $reader.Dispose()
    }

    $namespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    $ns = [System.Xml.XmlNamespaceManager]::new($document.NameTable)
    $ns.AddNamespace('w', $namespace)

    $paragraphs = $document.SelectNodes('//w:p', $ns)
    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("INDEX`tSTYLE`tINTABLE`tPAGEBREAK`tSECTION`tTEXT")

    for ($index = 0; $index -lt $paragraphs.Count; $index++) {
        $paragraph = $paragraphs[$index]
        $styleNode = $paragraph.SelectSingleNode('./w:pPr/w:pStyle', $ns)
        $style = if ($styleNode) { $styleNode.GetAttribute('val', $namespace) } else { '' }
        $inTable = [bool]$paragraph.SelectSingleNode('ancestor::w:tbl', $ns)
        $hasPageBreak = [bool]$paragraph.SelectSingleNode('.//w:br[@w:type="page"]', $ns)
        $hasSection = [bool]$paragraph.SelectSingleNode('./w:pPr/w:sectPr', $ns)

        $textParts = [System.Collections.Generic.List[string]]::new()
        foreach ($node in $paragraph.SelectNodes('.//w:t | .//w:tab | .//w:br', $ns)) {
            if ($node.LocalName -eq 't') {
                $textParts.Add($node.InnerText)
            }
            elseif ($node.LocalName -eq 'tab') {
                $textParts.Add(' ')
            }
            else {
                $textParts.Add(' ')
            }
        }

        $text = (($textParts -join '') -replace "[`r`n`t]+", ' ' -replace '\s{2,}', ' ').Trim()
        $lines.Add(("{0}`t{1}`t{2}`t{3}`t{4}`t{5}" -f $index, $style, $inTable, $hasPageBreak, $hasSection, $text))
    }

    [System.IO.File]::WriteAllLines($resolvedOutput, $lines, [System.Text.UTF8Encoding]::new($false))
}
finally {
    $archive.Dispose()
}
